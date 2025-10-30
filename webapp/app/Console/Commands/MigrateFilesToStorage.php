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

class MigrateFilesToStorage extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'migrate:files-to-storage
                            {--source=/old_entoo/entoo_subjects : Source directory path}
                            {--user=1 : User ID to own the files}
                            {--dry-run : Run without making changes}
                            {--limit= : Limit number of files to migrate}
                            {--skip-duplicates : Skip files that already exist in storage}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate all files from old_entoo to storage/app/uploads - includes ALL file types';

    private DocumentParserService $parserService;
    private ElasticsearchService $elasticsearchService;

    private $stats = [
        'total_files' => 0,
        'migrated' => 0,
        'skipped_duplicate' => 0,
        'skipped_already_in_storage' => 0,
        'failed' => 0,
        'errors' => []
    ];

    // Support ALL file types (not just searchable ones)
    private $validCategories = ['Materialy', 'Otazky', 'Prednasky', 'Seminare'];

    // Files that can be indexed in Elasticsearch
    private $searchableExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'];

    public function __construct(DocumentParserService $parserService, ElasticsearchService $elasticsearchService)
    {
        parent::__construct();
        $this->parserService = $parserService;
        $this->elasticsearchService = $elasticsearchService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $sourcePath = $this->option('source');
        $userId = (int) $this->option('user');
        $dryRun = $this->option('dry-run');
        $limit = $this->option('limit') ? (int) $this->option('limit') : null;
        $skipDuplicates = $this->option('skip-duplicates');

        // Validate user
        $user = User::find($userId);
        if (!$user) {
            $this->error("User with ID {$userId} not found!");
            return 1;
        }

        // Build full source path
        $fullPath = (str_starts_with($sourcePath, '/') || str_starts_with($sourcePath, 'C:'))
            ? $sourcePath
            : base_path($sourcePath);

        if (!is_dir($fullPath)) {
            $this->error("Source directory not found: {$fullPath}");
            return 1;
        }

        $this->info("========================================");
        $this->info("Entoo File Migration to Storage");
        $this->info("========================================");
        $this->info("Source: {$fullPath}");
        $this->info("Destination: storage/app/uploads");
        $this->info("User: {$user->name} (ID: {$user->id})");
        $this->info("Dry Run: " . ($dryRun ? 'YES' : 'NO'));
        $this->info("Skip Duplicates: " . ($skipDuplicates ? 'YES' : 'NO'));
        if ($limit) {
            $this->info("Limit: {$limit} files");
        }
        $this->info("========================================\n");

        // Scan directory structure - ALL file types
        $this->info("Scanning directory structure (ALL file types)...");
        $files = $this->scanDirectory($fullPath);
        $this->stats['total_files'] = count($files);

        $this->info("Found {$this->stats['total_files']} files\n");

        if ($this->stats['total_files'] === 0) {
            $this->warn("No files found to migrate.");
            return 0;
        }

        // Show breakdown by extension
        $this->showFileTypeBreakdown($files);

        // Ask for confirmation
        if (!$dryRun && !$this->confirm('Do you want to proceed with the migration?', true)) {
            $this->info("Migration cancelled.");
            return 0;
        }

        // Create storage directory if it doesn't exist
        if (!$dryRun) {
            Storage::makeDirectory('uploads');
        }

        // Process files
        $progressBar = $this->output->createProgressBar($limit ?? $this->stats['total_files']);
        $progressBar->start();

        $processedCount = 0;
        foreach ($files as $fileInfo) {
            if ($limit && $processedCount >= $limit) {
                break;
            }

            $this->processFile($fileInfo, $user, $dryRun, $skipDuplicates);
            $progressBar->advance();
            $processedCount++;
        }

        $progressBar->finish();
        $this->newLine(2);

        // Display summary
        $this->displaySummary();

        return 0;
    }

    /**
     * Scan directory and collect ALL file information
     */
    private function scanDirectory(string $path): array
    {
        $files = [];
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $file) {
            if (!$file->isFile()) {
                continue;
            }

            // Accept ALL file types (not just searchable ones)
            $extension = strtolower($file->getExtension());
            if (!$extension) {
                $extension = 'unknown';
            }

            // Parse path: entoo_subjects/{subject_name}/{category}/{filename}
            $relativePath = str_replace($path . DIRECTORY_SEPARATOR, '', $file->getPathname());
            $parts = explode(DIRECTORY_SEPARATOR, $relativePath);

            if (count($parts) < 2) {
                continue; // Skip files not in proper structure
            }

            $subjectName = $parts[0];
            $category = $parts[1] ?? 'Materialy';

            // Validate category
            if (!in_array($category, $this->validCategories)) {
                $category = 'Materialy';
            }

            $files[] = [
                'path' => $file->getPathname(),
                'filename' => $file->getFilename(),
                'subject_name' => $subjectName,
                'category' => $category,
                'size' => $file->getSize(),
                'extension' => $extension,
                'is_searchable' => in_array($extension, $this->searchableExtensions)
            ];
        }

        return $files;
    }

    /**
     * Show file type breakdown
     */
    private function showFileTypeBreakdown(array $files): void
    {
        $extensions = [];
        foreach ($files as $file) {
            $ext = $file['extension'];
            $extensions[$ext] = ($extensions[$ext] ?? 0) + 1;
        }
        arsort($extensions);

        $this->info("File Type Breakdown:");
        foreach (array_slice($extensions, 0, 10) as $ext => $count) {
            $searchable = in_array($ext, $this->searchableExtensions) ? '✓ Searchable' : '✗ Accessible only';
            $this->line("  {$ext}: {$count} files ({$searchable})");
        }
        $this->newLine();
    }

    /**
     * Process a single file - COPY to storage
     */
    private function processFile(array $fileInfo, User $user, bool $dryRun, bool $skipDuplicates): void
    {
        try {
            // Check if file already exists in database by subject+filename+category
            // (More reliable than filepath since we're migrating locations)
            $existing = UploadedFile::where('subject_name', $fileInfo['subject_name'])
                ->where('original_filename', $fileInfo['filename'])
                ->where('category', $fileInfo['category'])
                ->first();

            if ($existing) {
                // Check if it's already in storage (not old_entoo)
                if (!str_contains($existing->filepath, 'old_entoo')) {
                    $this->stats['skipped_already_in_storage']++;
                    return;
                }

                if ($skipDuplicates) {
                    $this->stats['skipped_duplicate']++;
                    return;
                }

                // Update existing record to point to new storage location
                if (!$dryRun) {
                    $this->updateExistingFile($existing, $fileInfo, $user);
                }
                $this->stats['migrated']++;
                return;
            }

            if ($dryRun) {
                $this->stats['migrated']++;
                return;
            }

            // Create new storage path: uploads/{subject_slug}/{category_slug}/
            $subjectSlug = Str::slug($fileInfo['subject_name']);
            $categorySlug = Str::slug($fileInfo['category']);
            $storagePath = "uploads/{$subjectSlug}/{$categorySlug}";

            // Generate unique filename
            $filename = pathinfo($fileInfo['filename'], PATHINFO_FILENAME);
            $uniqueFilename = Str::slug($filename) . '_' . uniqid() . '.' . $fileInfo['extension'];
            $fullStoragePath = "{$storagePath}/{$uniqueFilename}";

            // Copy file to storage - ensure directory exists with recursive flag
            $targetPath = storage_path("app/{$fullStoragePath}");
            $targetDir = dirname($targetPath);

            if (!is_dir($targetDir)) {
                mkdir($targetDir, 0755, true); // Recursive directory creation
            }

            if (!copy($fileInfo['path'], $targetPath)) {
                throw new \Exception("Failed to copy file to storage");
            }

            // Parse content if searchable
            $content = '';
            if ($fileInfo['is_searchable']) {
                try {
                    $content = $this->parserService->extractText(storage_path("app/{$fullStoragePath}"), $fileInfo['extension']);
                } catch (\Throwable $e) {
                    // If parsing fails, continue with empty content
                    $this->warn("  ⚠ Failed to parse file content: {$e->getMessage()}");
                    $content = '';
                }
            }

            // Start transaction
            DB::beginTransaction();

            try {
                // Create database record with NEW storage path
                $uploadedFile = UploadedFile::create([
                    'user_id' => $user->id,
                    'filename' => $uniqueFilename,
                    'original_filename' => $fileInfo['filename'],
                    'filepath' => $fullStoragePath, // NEW: storage path, not old_entoo path
                    'subject_name' => $fileInfo['subject_name'],
                    'category' => $fileInfo['category'],
                    'file_size' => $fileInfo['size'],
                    'file_extension' => $fileInfo['extension']
                ]);

                DB::commit();

                // Index in Elasticsearch if searchable
                if ($fileInfo['is_searchable']) {
                    try {
                        $this->elasticsearchService->indexDocument([
                            'file_id' => $uploadedFile->id,
                            'user_id' => $user->id,
                            'filename' => $uniqueFilename,
                            'original_filename' => $fileInfo['filename'],
                            'subject_name' => $fileInfo['subject_name'],
                            'category' => $fileInfo['category'],
                            'file_extension' => $fileInfo['extension'],
                            'file_size' => $fileInfo['size'],
                            'content' => $content,
                            'created_at' => now()->toIso8601String()
                        ]);
                    } catch (\Throwable $e) {
                        $this->warn("  ⚠ Failed to index in Elasticsearch: {$e->getMessage()}");
                    }
                }

                $this->stats['migrated']++;
            } catch (\Exception $e) {
                DB::rollBack();
                // Delete copied file on database failure
                if (file_exists(storage_path("app/{$fullStoragePath}"))) {
                    unlink(storage_path("app/{$fullStoragePath}"));
                }
                throw $e;
            }

        } catch (\Exception $e) {
            $this->stats['failed']++;
            $this->stats['errors'][] = [
                'file' => $fileInfo['filename'],
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Update existing file record to point to new storage location
     */
    private function updateExistingFile(UploadedFile $existing, array $fileInfo, User $user): void
    {
        // Create new storage path
        $subjectSlug = Str::slug($fileInfo['subject_name']);
        $categorySlug = Str::slug($fileInfo['category']);
        $storagePath = "uploads/{$subjectSlug}/{$categorySlug}";

        $filename = pathinfo($fileInfo['filename'], PATHINFO_FILENAME);
        $uniqueFilename = Str::slug($filename) . '_' . uniqid() . '.' . $fileInfo['extension'];
        $fullStoragePath = "{$storagePath}/{$uniqueFilename}";

        // Copy file to new location - ensure directory exists
        $targetPath = storage_path("app/{$fullStoragePath}");
        $targetDir = dirname($targetPath);

        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true); // Recursive directory creation
        }

        if (!copy($fileInfo['path'], $targetPath)) {
            throw new \Exception("Failed to copy file to storage");
        }

        // Update database record
        $existing->update([
            'filepath' => $fullStoragePath,
            'filename' => $uniqueFilename
        ]);

        $this->info("  ✓ Updated existing record ID {$existing->id}");
    }

    /**
     * Display migration summary
     */
    private function displaySummary(): void
    {
        $this->info("========================================");
        $this->info("Migration Summary");
        $this->info("========================================");
        $this->info("Total Files Found: {$this->stats['total_files']}");
        $this->info("Successfully Migrated: {$this->stats['migrated']}");
        $this->info("Skipped (Duplicate): {$this->stats['skipped_duplicate']}");
        $this->info("Skipped (Already in Storage): {$this->stats['skipped_already_in_storage']}");
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
            $this->info("Files are now in storage/app/uploads and can be accessed via GUI.");
            $this->info("After verifying the migration, you can safely remove the old_entoo mount.");
        }
    }
}
