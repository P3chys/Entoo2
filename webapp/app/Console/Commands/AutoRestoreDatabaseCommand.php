<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\UploadedFile;
use App\Models\User;

class AutoRestoreDatabaseCommand extends Command
{
    protected $signature = 'db:auto-restore
                            {--force : Force restoration even if files exist}';

    protected $description = 'Automatically restore database from Elasticsearch if empty';

    public function handle()
    {
        $fileCount = UploadedFile::count();
        $userCount = User::count();

        $this->info("Current database status:");
        $this->info("  Users: {$userCount}");
        $this->info("  Files: {$fileCount}");

        // If database has data and not forcing, skip
        if ($fileCount > 0 && !$this->option('force')) {
            $this->info("Database already has data. Skipping restoration.");
            return 0;
        }

        if ($fileCount == 0) {
            $this->warn("⚠️  Database is EMPTY! Auto-restoring from Elasticsearch...");

            // Create user if missing
            if ($userCount == 0) {
                $this->info("Creating user ID 28...");
                $this->call('db:seed', ['--class' => 'DatabaseSeeder']);
            }

            // Restore from Elasticsearch
            $this->info("Syncing files from Elasticsearch...");
            $this->call('sync:db-from-elasticsearch', [
                '--user' => 28,
                '--no-interaction' => true
            ]);

            $this->newLine();
            $this->info("✅ Auto-restoration complete!");

            // Show final status
            $finalFileCount = UploadedFile::count();
            $finalUserCount = User::count();
            $this->info("Final status:");
            $this->info("  Users: {$finalUserCount}");
            $this->info("  Files: {$finalFileCount}");
        }

        return 0;
    }
}
