<?php

namespace App\Console\Commands;

use App\Models\UploadedFile;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SyncStorageFiles extends Command
{
    protected $signature = 'storage:sync-files
                            {--user=1 : User ID to own the files}
                            {--dry-run : Run without making changes}
                            {--limit= : Limit number of files to sync}';

    protected $description = 'Sync existing files from storage/app/uploads to database';

    private $stats = [
        'total_files' => 0,
        'synced' => 0,
        'skipped_already_exists' => 0,
        'skipped_invalid_structure' => 0,
        'failed' => 0,
        'errors' => [],
    ];

    private $validCategories = ['materialy', 'otazky', 'prednasky', 'seminare'];

    public function handle()
    {
        $userId = (int) $this->option('user');
        $dryRun = $this->option('dry-run');
        $limit = $this->option('limit') ? (int) $this->option('limit') : null;

        $user = User::find($userId);
        if (! $user) {
            $this->error("User with ID {$userId} not found!");
            return 1;
        }

        $storagePath = storage_path('app/uploads');
        if (! is_dir($storagePath)) {
            $this->error("Storage directory not found: {$storagePath}");
            return 1;
        }

        $this->info('========================================');
        $this->info('Sync Storage Files to Database');
        $this->info('========================================');
        $this->info("Storage Path: {$storagePath}");
        $this->info("User: {$user->name} (ID: {$user->id})");
        $this->info('Dry Run: '.($dryRun ? 'YES' : 'NO'));
        $this->info("========================================\n");

        // Use find command to get ALL files
        $this->info('Scanning storage directory...');
        exec('find '.escapeshellarg($storagePath).' -type f', $allFiles);

        $this->stats['total_files'] = count($allFiles);
        $this->info("Found {$this->stats['total_files']} files\n");

        if ($this->stats['total_files'] === 0) {
            $this->warn('No files found to sync.');
            return 0;
        }

        if (! $dryRun && ! $this->confirm('Do you want to proceed with syncing?', true)) {
            $this->info('Sync cancelled.');
            return 0;
        }

        $progressBar = $this->output->createProgressBar($limit ?? $this->stats['total_files']);
        $progressBar->start();

        $processedCount = 0;
        foreach ($allFiles as $filepath) {
            if ($limit && $processedCount >= $limit) {
                break;
            }

            $this->processFile($filepath, $user, $dryRun, $storagePath);
            $progressBar->advance();
            $processedCount++;
        }

        $progressBar->finish();
        $this->newLine(2);

        $this->displaySummary();

        return 0;
    }

    private function processFile(string $filepath, User $user, bool $dryRun, string $storagePath): void
    {
        try {
            if (! file_exists($filepath) || ! is_file($filepath)) {
                $this->stats['skipped_invalid_structure']++;
                return;
            }

            // Parse path structure: uploads/{subject}/{category}/{filename}
            $relativePath = str_replace($storagePath.'/', '', $filepath);
            $parts = explode('/', $relativePath);

            if (count($parts) < 3) {
                $this->stats['skipped_invalid_structure']++;
                return;
            }

            $subjectSlug = $parts[0];
            $categorySlug = $parts[1];
            $filename = $parts[2];

            // Convert slugs back to readable names
            $subjectName = str_replace('-', ' ', $subjectSlug);
            $categoryName = ucfirst(str_replace('-', '', $categorySlug)); // materialy -> Materialy

            // Validate category (case-insensitive)
            if (! in_array(strtolower($categoryName), $this->validCategories)) {
                $this->stats['skipped_invalid_structure']++;
                return;
            }

            // Extract original filename from hashed filename
            // Format: {name}_{hash}.{ext}
            $lastUnderscore = strrpos($filename, '_');
            $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

            if ($lastUnderscore === false) {
                // No hash, use filename as-is
                $originalFilename = $filename;
            } else {
                // Extract name before hash
                $nameWithoutHash = substr($filename, 0, $lastUnderscore);
                $originalFilename = str_replace('-', ' ', $nameWithoutHash) . '.' . $extension;
            }

            if (! $extension) {
                $extension = 'unknown';
            }

            $fileSize = filesize($filepath);

            // Relative path from storage/app
            $relativeStoragePath = 'uploads/'.$relativePath;

            // Check if already exists in database
            $existing = UploadedFile::where('filepath', $relativeStoragePath)->first();

            if ($existing) {
                $this->stats['skipped_already_exists']++;
                return;
            }

            if ($dryRun) {
                $this->stats['synced']++;
                return;
            }

            // Create database record
            DB::beginTransaction();

            try {
                UploadedFile::create([
                    'user_id' => $user->id,
                    'filename' => $filename,
                    'original_filename' => $originalFilename,
                    'filepath' => $relativeStoragePath,
                    'subject_name' => $subjectName,
                    'category' => $categoryName,
                    'file_size' => $fileSize,
                    'file_extension' => $extension,
                    'processing_status' => 'completed',
                    'processed_at' => now(),
                ]);

                DB::commit();
                $this->stats['synced']++;
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            $this->stats['failed']++;
            $this->stats['errors'][] = [
                'file' => basename($filepath ?? 'unknown'),
                'error' => $e->getMessage(),
            ];
        }
    }

    private function displaySummary(): void
    {
        $this->info('========================================');
        $this->info('Sync Summary');
        $this->info('========================================');
        $this->info("Total Files Found: {$this->stats['total_files']}");
        $this->info("Successfully Synced: {$this->stats['synced']}");
        $this->info("Skipped (Already Exists): {$this->stats['skipped_already_exists']}");
        $this->info("Skipped (Invalid Structure): {$this->stats['skipped_invalid_structure']}");
        $this->info("Failed: {$this->stats['failed']}");
        $this->info("========================================\n");

        if ($this->stats['failed'] > 0) {
            $this->warn('Some files failed to sync. Showing first 10 errors:');
            foreach (array_slice($this->stats['errors'], 0, 10) as $error) {
                $this->error("- {$error['file']}: {$error['error']}");
            }
        }

        if ($this->stats['synced'] > 0) {
            $this->info("\n✓ Sync completed!");
            $this->info("\nNote: Elasticsearch indexes were NOT updated. Run 'php artisan elasticsearch:reindex' if needed.");
        }
    }
}
