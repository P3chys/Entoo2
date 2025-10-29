<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\UploadedFile;
use App\Services\DocumentParserService;
use App\Services\ElasticsearchService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportExistingFiles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'import:existing-files
                            {--source=/old_entoo/entoo_subjects : Source directory path}
                            {--user=1 : User ID to own the files}
                            {--dry-run : Run without making changes}
                            {--limit= : Limit number of files to import}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import existing files from old_entoo/entoo_subjects directory structure';

    private DocumentParserService $parserService;
    private ElasticsearchService $elasticsearchService;

    private $stats = [
        'total_files' => 0,
        'imported' => 0,
        'skipped' => 0,
        'failed' => 0,
        'errors' => []
    ];

    private $supportedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'];
    private $validCategories = ['Materialy', 'Otazky', 'Prednasky', 'Seminare'];

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

        // Validate user
        $user = User::find($userId);
        if (!$user) {
            $this->error("User with ID {$userId} not found!");
            return 1;
        }

        // Build full source path
        // If path starts with /, treat as absolute path, otherwise relative to base_path
        $fullPath = (str_starts_with($sourcePath, '/') || str_starts_with($sourcePath, 'C:'))
            ? $sourcePath
            : base_path($sourcePath);

        if (!is_dir($fullPath)) {
            $this->error("Source directory not found: {$fullPath}");
            return 1;
        }

        $this->info("========================================");
        $this->info("Entoo File Import");
        $this->info("========================================");
        $this->info("Source: {$fullPath}");
        $this->info("User: {$user->name} (ID: {$user->id})");
        $this->info("Dry Run: " . ($dryRun ? 'YES' : 'NO'));
        if ($limit) {
            $this->info("Limit: {$limit} files");
        }
        $this->info("========================================\n");

        // Scan directory structure
        $this->info("Scanning directory structure...");
        $files = $this->scanDirectory($fullPath);
        $this->stats['total_files'] = count($files);

        $this->info("Found {$this->stats['total_files']} files\n");

        if ($this->stats['total_files'] === 0) {
            $this->warn("No files found to import.");
            return 0;
        }

        // Ask for confirmation
        if (!$dryRun && !$this->confirm('Do you want to proceed with the import?', true)) {
            $this->info("Import cancelled.");
            return 0;
        }

        // Process files
        $progressBar = $this->output->createProgressBar($limit ?? $this->stats['total_files']);
        $progressBar->start();

        $processedCount = 0;
        foreach ($files as $fileInfo) {
            $this->info("\nProcessing: {$fileInfo['path']}");
            if ($limit && $processedCount >= $limit) {
                break;
            }

            $this->processFile($fileInfo, $user, $dryRun);
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
     * Scan directory and collect file information
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

            $extension = strtolower($file->getExtension());
            if (!in_array($extension, $this->supportedExtensions)) {
                continue;
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
                'extension' => $extension
            ];
        }

        return $files;
    }

    /**
     * Process a single file
     */
    private function processFile(array $fileInfo, User $user, bool $dryRun): void
    {
        try {
            // Check if file already exists
            $existing = UploadedFile::where('filepath', $fileInfo['path'])->first();
            if ($existing) {
                $this->stats['skipped']++;
                return;
            }

            if ($dryRun) {
                $this->stats['imported']++;
                return;
            }

            // Parse document content
            $content = '';
            try {
                $content = $this->parserService->extractText($fileInfo['path'], $fileInfo['extension']);
            } catch (\Throwable $e) {
                // If parsing fails, log warning and continue with empty content
                // Using \Throwable to catch both Exceptions and Errors (like FatalError)
                $this->warn("  ⚠ Failed to parse file content: {$e->getMessage()}");
                $content = '';
            }

            // Create slug for storage path
            $subjectSlug = Str::slug($fileInfo['subject_name']);
            $categorySlug = Str::slug($fileInfo['category']);

            // Generate unique filename
            $filename = pathinfo($fileInfo['filename'], PATHINFO_FILENAME);
            $uniqueFilename = Str::slug($filename) . '_' . uniqid() . '.' . $fileInfo['extension'];

            // Start transaction for database only
            DB::beginTransaction();

            try {
                // Create database record FIRST - this ensures the file is accessible
                $uploadedFile = UploadedFile::create([
                    'user_id' => $user->id,
                    'filename' => $uniqueFilename,
                    'original_filename' => $fileInfo['filename'],
                    'filepath' => $fileInfo['path'], // Store original path
                    'subject_name' => $fileInfo['subject_name'],
                    'category' => $fileInfo['category'],
                    'file_size' => $fileInfo['size'],
                    'file_extension' => $fileInfo['extension']
                ]);

                DB::commit();

                // Try to index in Elasticsearch AFTER database commit
                // If this fails, the file is still accessible from the database
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
                    // Log Elasticsearch indexing failure but don't fail the import
                    $this->warn("  ⚠ Failed to index in Elasticsearch (file still imported): {$e->getMessage()}");
                }

                $this->stats['imported']++;
            } catch (\Exception $e) {
                DB::rollBack();
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
     * Display import summary
     */
    private function displaySummary(): void
    {
        $this->info("========================================");
        $this->info("Import Summary");
        $this->info("========================================");
        $this->info("Total Files Found: {$this->stats['total_files']}");
        $this->info("Successfully Imported: {$this->stats['imported']}");
        $this->info("Skipped (Already Exist): {$this->stats['skipped']}");
        $this->info("Failed: {$this->stats['failed']}");
        $this->info("========================================\n");

        if ($this->stats['failed'] > 0) {
            $this->warn("Some files failed to import. Showing first 10 errors:");
            foreach (array_slice($this->stats['errors'], 0, 10) as $error) {
                $this->error("- {$error['file']}: {$error['error']}");
            }
        }

        if ($this->stats['imported'] > 0) {
            $this->info("\n✓ Import completed successfully!");
        }
    }
}
