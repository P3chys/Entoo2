<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\UploadedFile;
use App\Services\DocumentParserService;
use App\Services\ElasticsearchService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MigrateRemainingFiles extends Command
{
    protected $signature = 'migrate:remaining-files
                            {--source=/old_entoo/entoo_subjects : Source directory path}
                            {--user=1 : User ID to own the files}
                            {--dry-run : Run without making changes}
                            {--limit= : Limit number of files to migrate}';

    protected $description = 'Migrate remaining files with special characters using find command';

    private DocumentParserService $parserService;
    private ElasticsearchService $elasticsearchService;

    private $stats = [
        'total_files' => 0,
        'migrated' => 0,
        'skipped_already_migrated' => 0,
        'skipped_invalid_structure' => 0,
        'failed' => 0,
        'errors' => []
    ];

    private $validCategories = ['Materialy', 'Otazky', 'Prednasky', 'Seminare'];
    private $searchableExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'];

    public function __construct(DocumentParserService $parserService, ElasticsearchService $elasticsearchService)
    {
        parent::__construct();
        $this->parserService = $parserService;
        $this->elasticsearchService = $elasticsearchService;
    }

    public function handle()
    {
    $sourcePath = $this->option('source');
        $userId = (int) $this->option('user');
        $dryRun = $this->option('dry-run');
        $limit = $this->option('limit') ? (int) $this->option('limit') : null;

        // Normalize source path: allow relative paths and fall back to storage/app/upload
        if (!Str::startsWith($sourcePath, ['/', '\\'])) {
            // If user passed a path that starts with 'storage' treat it as base_path relative,
            // otherwise assume it's relative to storage/app
            if (Str::startsWith($sourcePath, 'storage')) {
                $sourcePath = base_path($sourcePath);
            } else {
                $sourcePath = storage_path($sourcePath);
            }
        }

        // If the resolved path doesn't exist, try the common storage path as a fallback
        if (!is_dir($sourcePath)) {
            $fallback = storage_path('app/upload');
            if (is_dir($fallback)) {
                $this->warn("Source directory not found: {$sourcePath}. Using fallback: {$fallback}");
                $sourcePath = $fallback;
            }
        }

        $user = User::find($userId);
        if (!$user) {
            $this->error("User with ID {$userId} not found!");
            return 1;
        }

        if (!is_dir($sourcePath)) {
            $this->error("Source directory not found: {$sourcePath}");
            return 1;
        }

        $this->info("========================================");
        $this->info("Migrate Remaining Files (using find)");
        $this->info("========================================");
        $this->info("Source: {$sourcePath}");
        $this->info("User: {$user->name} (ID: {$user->id})");
        $this->info("Dry Run: " . ($dryRun ? 'YES' : 'NO'));
        $this->info("========================================\n");

        // Use find command to get ALL files (handles special characters)
        $this->info("Scanning with find command (handles special characters)...");
        exec("find " . escapeshellarg($sourcePath) . " -type f", $allFiles);

        $this->stats['total_files'] = count($allFiles);
        $this->info("Found {$this->stats['total_files']} files\n");

        if ($this->stats['total_files'] === 0) {
            $this->warn("No files found to migrate.");
            return 0;
        }

        if (!$dryRun && !$this->confirm('Do you want to proceed with the migration?', true)) {
            $this->info("Migration cancelled.");
            return 0;
        }

        $progressBar = $this->output->createProgressBar($limit ?? $this->stats['total_files']);
        $progressBar->start();

        $processedCount = 0;
        foreach ($allFiles as $filepath) {
            if ($limit && $processedCount >= $limit) {
                break;
            }

            $this->processFile($filepath, $user, $dryRun, $sourcePath);
            $progressBar->advance();
            $processedCount++;
        }

        $progressBar->finish();
        $this->newLine(2);

        $this->displaySummary();

        return 0;
    }

    private function processFile(string $filepath, User $user, bool $dryRun, string $sourcePath): void
    {
        try {
            if (!file_exists($filepath) || !is_file($filepath)) {
                $this->stats['skipped_invalid_structure']++;
                return;
            }

            // Parse path structure
            $relativePath = str_replace($sourcePath . '/', '', $filepath);
            $parts = explode('/', $relativePath);

            if (count($parts) < 2) {
                $this->stats['skipped_invalid_structure']++;
                return;
            }

            $subjectName = $parts[0];
            $category = $parts[1] ?? 'Materialy';

            // Validate category
            if (!in_array($category, $this->validCategories)) {
                $category = 'Materialy';
            }

            $filename = basename($filepath);
            $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            if (!$extension) {
                $extension = 'unknown';
            }

            // Check if already migrated (by subject + filename + category)
            $existing = UploadedFile::where('subject_name', $subjectName)
                ->where('original_filename', $filename)
                ->where('category', $category)
                ->whereNotLike('filepath', '%old_entoo%')
                ->first();

            if ($existing) {
                $this->stats['skipped_already_migrated']++;
                return;
            }

            if ($dryRun) {
                $this->stats['migrated']++;
                return;
            }

            // Create storage path
            $subjectSlug = Str::slug($subjectName);
            $categorySlug = Str::slug($category);
            $storagePath = "uploads/{$subjectSlug}/{$categorySlug}";

            $fileBasename = pathinfo($filename, PATHINFO_FILENAME);
            $uniqueFilename = Str::slug($fileBasename) . '_' . uniqid() . '.' . $extension;
            $fullStoragePath = "{$storagePath}/{$uniqueFilename}";

            // Copy file to storage
            $targetPath = storage_path("app/{$fullStoragePath}");
            $targetDir = dirname($targetPath);

            if (!is_dir($targetDir)) {
                mkdir($targetDir, 0755, true);
            }

            if (!copy($filepath, $targetPath)) {
                throw new \Exception("Failed to copy file to storage");
            }

            // Parse content if searchable
            $content = '';
            $isSearchable = in_array($extension, $this->searchableExtensions);
            if ($isSearchable) {
                try {
                    $content = $this->parserService->extractText($targetPath, $extension);
                } catch (\Throwable $e) {
                    $content = '';
                }
            }

            // Start transaction
            DB::beginTransaction();

            try {
                // Create database record
                $uploadedFile = UploadedFile::create([
                    'user_id' => $user->id,
                    'filename' => $uniqueFilename,
                    'original_filename' => $filename,
                    'filepath' => $fullStoragePath,
                    'subject_name' => $subjectName,
                    'category' => $category,
                    'file_size' => filesize($filepath),
                    'file_extension' => $extension,
                    'processing_status' => 'completed',
                    'processed_at' => now(),
                ]);

                DB::commit();

                // Index in Elasticsearch if searchable
                if ($isSearchable) {
                    try {
                        $this->elasticsearchService->indexDocument([
                            'file_id' => $uploadedFile->id,
                            'user_id' => $user->id,
                            'filename' => $uniqueFilename,
                            'original_filename' => $filename,
                            'subject_name' => $subjectName,
                            'category' => $category,
                            'file_extension' => $extension,
                            'file_size' => filesize($filepath),
                            'content' => $content,
                            'created_at' => now()->toIso8601String()
                        ]);
                    } catch (\Throwable $e) {
                        // Elasticsearch failure doesn't fail the migration
                    }
                }

                $this->stats['migrated']++;
            } catch (\Exception $e) {
                DB::rollBack();
                if (file_exists($targetPath)) {
                    unlink($targetPath);
                }
                throw $e;
            }

        } catch (\Exception $e) {
            $this->stats['failed']++;
            $this->stats['errors'][] = [
                'file' => basename($filepath ?? 'unknown'),
                'error' => $e->getMessage()
            ];
        }
    }

    private function displaySummary(): void
    {
        $this->info("========================================");
        $this->info("Migration Summary");
        $this->info("========================================");
        $this->info("Total Files Found: {$this->stats['total_files']}");
        $this->info("Successfully Migrated: {$this->stats['migrated']}");
        $this->info("Skipped (Already Migrated): {$this->stats['skipped_already_migrated']}");
        $this->info("Skipped (Invalid Structure): {$this->stats['skipped_invalid_structure']}");
        $this->info("Failed: {$this->stats['failed']}");
        $this->info("========================================\n");

        if ($this->stats['failed'] > 0) {
            $this->warn("Some files failed to migrate. Showing first 10 errors:");
            foreach (array_slice($this->stats['errors'], 0, 10) as $error) {
                $this->error("- {$error['file']}: {$error['error']}");
            }
        }

        if ($this->stats['migrated'] > 0) {
            $this->info("\n✓ Migration completed!");
        }
    }
}
