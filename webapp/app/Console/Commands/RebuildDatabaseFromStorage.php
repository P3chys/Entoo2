<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\UploadedFile;
use App\Models\FavoriteSubject;
use App\Services\ElasticsearchService;
use App\Services\DocumentParserService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;

class RebuildDatabaseFromStorage extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'db:rebuild-from-storage
                            {--user=1 : User ID to own the files}
                            {--dry-run : Run without making changes}
                            {--clear-all : Clear Redis, PostgreSQL, and Elasticsearch before rebuild}
                            {--force : Skip all confirmations}';

    /**
     * The console command description.
     */
    protected $description = 'Rebuild database from existing files in storage/app/uploads';

    private $stats = [
        'total_files' => 0,
        'imported' => 0,
        'skipped' => 0,
        'failed' => 0,
        'errors' => []
    ];

    private $supportedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'rtf', 'jpg', 'jpeg', 'png', 'heic', 'xlsx', 'xls', 'zip', 'rar', 'pages', 'odt', 'xps', 'oxps', 'odp', 'html', 'apkg'];
    private $parseableExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'];

    private ElasticsearchService $elasticsearchService;
    private DocumentParserService $documentParserService;

    public function __construct(
        ElasticsearchService $elasticsearchService,
        DocumentParserService $documentParserService
    ) {
        parent::__construct();
        $this->elasticsearchService = $elasticsearchService;
        $this->documentParserService = $documentParserService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $userId = (int) $this->option('user');
        $dryRun = $this->option('dry-run');
        $clearAll = $this->option('clear-all');

        // Validate user
        $user = User::find($userId);
        if (!$user) {
            $this->error("User with ID {$userId} not found!");
            return 1;
        }

        $this->info("========================================");
        $this->info("DATABASE REBUILD FROM STORAGE");
        $this->info("========================================");
        $this->info("User: {$user->name} (ID: {$user->id})");
        $this->info("Dry Run: " . ($dryRun ? 'YES' : 'NO'));
        $this->info("Clear All: " . ($clearAll ? 'YES' : 'NO'));
        $this->info("========================================\n");

        // Clear all data if requested
        if ($clearAll) {
            $force = $this->option('force');
            if (!$dryRun && !$force && !$this->confirm('⚠ WARNING: This will delete ALL data from Redis, PostgreSQL, and Elasticsearch. Continue?', false)) {
                $this->warn('Operation cancelled.');
                return 0;
            }

            $this->clearAllData($dryRun);
        }

        // Scan storage directories
        $this->info("Scanning storage directories...");

        $files = [];
        $basePaths = [
            storage_path('app/uploads'),
            storage_path('app/private/uploads')
        ];

        foreach ($basePaths as $basePath) {
            if (is_dir($basePath)) {
                $foundFiles = $this->scanDirectory($basePath, $basePath);
                $files = array_merge($files, $foundFiles);
                $this->info("Found " . count($foundFiles) . " files in " . $basePath);
            }
        }

        $this->stats['total_files'] = count($files);
        $this->info("Total files found: {$this->stats['total_files']}\n");

        if ($this->stats['total_files'] === 0) {
            $this->warn("No files found to import.");
            return 0;
        }

        // Ask for confirmation
        $force = $this->option('force');
        if (!$dryRun && !$force && !$this->confirm('Do you want to proceed with the rebuild?', true)) {
            $this->info("Rebuild cancelled.");
            return 0;
        }

        // Process files
        $progressBar = $this->output->createProgressBar($this->stats['total_files']);
        $progressBar->start();

        foreach ($files as $fileInfo) {
            $this->processFile($fileInfo, $user, $dryRun);
            $progressBar->advance();
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
    private function scanDirectory(string $path, string $basePath): array
    {
        $files = [];

        if (!is_dir($path)) {
            return $files;
        }

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

            // Parse path: uploads/{subject-name}/{category}/{uuid-filename.ext}
            // OR: private/uploads/{subject-name}/{category}/{uuid-filename.ext}
            $relativePath = str_replace($basePath . DIRECTORY_SEPARATOR, '', $file->getPathname());
            $relativePath = str_replace('\\', '/', $relativePath);
            $parts = explode('/', $relativePath);

            if (count($parts) < 3) {
                continue; // Skip files not in proper structure
            }

            $subjectSlug = $parts[0];
            $categorySlug = $parts[1];
            $filename = $parts[2];

            // Convert slugs back to proper names
            $subjectName = $this->unslugify($subjectSlug);
            $category = $this->categorizeName($categorySlug);

            // Extract original filename from filename if it has the pattern: name_hash.ext
            // or uuid.ext
            $originalFilename = $this->extractOriginalFilename($filename);

            $files[] = [
                'path' => $file->getPathname(),
                'filename' => $filename,
                'original_filename' => $originalFilename,
                'subject_name' => $subjectName,
                'category' => $category,
                'size' => $file->getSize(),
                'extension' => $extension
            ];
        }

        return $files;
    }

    /**
     * Convert slug to readable name
     */
    private function unslugify(string $slug): string
    {
        // Replace hyphens with spaces and capitalize each word
        return ucwords(str_replace('-', ' ', $slug));
    }

    /**
     * Map category slug to valid category name
     */
    private function categorizeName(string $slug): string
    {
        $categoryMap = [
            'prednasky' => 'Prednasky',
            'otazky' => 'Otazky',
            'materialy' => 'Materialy',
            'seminare' => 'Seminare'
        ];

        $slug = strtolower($slug);
        return $categoryMap[$slug] ?? 'Materialy';
    }

    /**
     * Extract original filename
     */
    private function extractOriginalFilename(string $filename): string
    {
        // If filename contains underscore and hash, extract the part before hash
        if (preg_match('/^(.+)_([a-f0-9]+)\.(pdf|docx?|pptx?|txt)$/i', $filename, $matches)) {
            return $matches[1] . '.' . $matches[3];
        }

        // If it's just a UUID, use the filename as-is
        return $filename;
    }

    /**
     * Process a single file
     */
    private function processFile(array $fileInfo, User $user, bool $dryRun): void
    {
        try {
            // Check if file already exists by filepath
            $existing = UploadedFile::where('filepath', $fileInfo['path'])->first();
            if ($existing) {
                $this->stats['skipped']++;
                return;
            }

            if ($dryRun) {
                $this->stats['imported']++;
                return;
            }

            // Parse document content for Elasticsearch (only for parseable types)
            $content = '';
            if (in_array($fileInfo['extension'], $this->parseableExtensions)) {
                try {
                    $content = $this->documentParserService->extractText($fileInfo['path'], $fileInfo['extension']);
                } catch (\Throwable $e) {
                    // Continue with empty content if parsing fails (catches both Exception and Error)
                }
            }

            // Create database record
            DB::beginTransaction();

            try {
                $uploadedFile = UploadedFile::create([
                    'user_id' => $user->id,
                    'filename' => $fileInfo['filename'],
                    'original_filename' => $fileInfo['original_filename'],
                    'filepath' => $fileInfo['path'],
                    'subject_name' => $fileInfo['subject_name'],
                    'category' => $fileInfo['category'],
                    'file_size' => $fileInfo['size'],
                    'file_extension' => $fileInfo['extension']
                ]);

                // Index in Elasticsearch
                try {
                    $this->elasticsearchService->indexDocument([
                        'file_id' => $uploadedFile->id,
                        'user_id' => $user->id,
                        'filename' => $fileInfo['filename'],
                        'original_filename' => $fileInfo['original_filename'],
                        'filepath' => $fileInfo['path'],
                        'subject_name' => $fileInfo['subject_name'],
                        'category' => $fileInfo['category'],
                        'file_extension' => $fileInfo['extension'],
                        'file_size' => $fileInfo['size'],
                        'content' => $content,
                        'created_at' => $uploadedFile->created_at->toIso8601String(),
                        'updated_at' => $uploadedFile->updated_at->toIso8601String(),
                    ]);
                } catch (\Throwable $e) {
                    // Log but don't fail - Elasticsearch indexing is optional
                }

                DB::commit();
                $this->stats['imported']++;
            } catch (\Throwable $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Throwable $e) {
            $this->stats['failed']++;
            $this->stats['errors'][] = [
                'file' => $fileInfo['filename'],
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Clear all data from Redis, PostgreSQL, and Elasticsearch
     */
    private function clearAllData(bool $dryRun): void
    {
        $this->info("\n🗑️  Clearing all data...");

        // Clear Redis
        $this->info("  - Clearing Redis cache...");
        if (!$dryRun) {
            Redis::flushdb();
            $this->info("    ✓ Redis cleared");
        } else {
            $this->warn("    [DRY RUN] Would clear Redis");
        }

        // Truncate PostgreSQL tables
        $this->info("  - Truncating PostgreSQL tables...");
        if (!$dryRun) {
            DB::statement('SET CONSTRAINTS ALL DEFERRED');
            FavoriteSubject::truncate();
            UploadedFile::truncate();
            $this->info("    ✓ Tables truncated: favorite_subjects, uploaded_files");
        } else {
            $this->warn("    [DRY RUN] Would truncate tables");
        }

        // Delete and recreate Elasticsearch index
        $this->info("  - Recreating Elasticsearch index...");
        if (!$dryRun) {
            try {
                $this->elasticsearchService->deleteIndex();
                $this->info("    ✓ Deleted existing index");

                $this->elasticsearchService->createIndex();
                $this->info("    ✓ Created new index");
            } catch (\Throwable $e) {
                $this->error("    ✗ Error: " . $e->getMessage());
            }
        } else {
            $this->warn("    [DRY RUN] Would delete and recreate Elasticsearch index");
        }

        $this->info("✓ All data cleared\n");
    }

    /**
     * Display import summary
     */
    private function displaySummary(): void
    {
        $this->info("========================================");
        $this->info("Rebuild Summary");
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
            $this->info("\n✓ Rebuild completed successfully!");
            $this->info("✓ Files imported to PostgreSQL and indexed in Elasticsearch");
        }
    }
}
