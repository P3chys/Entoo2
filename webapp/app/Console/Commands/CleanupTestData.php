<?php

namespace App\Console\Commands;

use App\Models\FavoriteSubject;
use App\Models\SubjectProfile;
use App\Models\UploadedFile;
use App\Services\ElasticsearchService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CleanupTestData extends Command
{
    protected $signature = 'cleanup:test-data
                            {--dry-run : Show what would be deleted without deleting}
                            {--all : Delete all test data including files}';

    protected $description = 'Clean up test data from database, Elasticsearch, and cache (bypasses authorization)';

    private ElasticsearchService $elasticsearchService;

    public function __construct(ElasticsearchService $elasticsearchService)
    {
        parent::__construct();
        $this->elasticsearchService = $elasticsearchService;
    }

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $deleteAll = $this->option('all');

        $this->info('🧹 Starting test data cleanup...');
        if ($dryRun) {
            $this->warn('🔍 DRY RUN MODE - No changes will be made');
        }

        // Define test patterns
        $testPatterns = [
            '%Test Subject%',
            '%XSS_%',
            '%alert%',
            '%<script>%',
            '%<img src%',
            '%">%',
            '%TestSubject',
        ];

        // Find all test files
        $testFiles = UploadedFile::where(function ($query) use ($testPatterns) {
            foreach ($testPatterns as $pattern) {
                $query->orWhere('subject_name', 'LIKE', $pattern);
            }
        })->get();

        $this->info("📊 Found {$testFiles->count()} test files in database");

        if ($testFiles->isEmpty()) {
            $this->info('✅ No test data found');

            return 0;
        }

        // Group by subject
        $subjects = $testFiles->pluck('subject_name')->unique();
        $this->info('📚 Test subjects:');
        foreach ($subjects as $subject) {
            $count = $testFiles->where('subject_name', $subject)->count();
            $this->line("   - \"{$subject}\" ({$count} files)");
        }

        if ($dryRun) {
            $this->info('✅ Dry run complete - no changes made');

            return 0;
        }

        // Confirm deletion
        if (! $deleteAll && ! $this->confirm('Delete all test data?', true)) {
            $this->warn('Cancelled');

            return 1;
        }

        $deletedCount = 0;
        $elasticsearchErrors = 0;

        // Delete files
        DB::beginTransaction();
        try {
            foreach ($testFiles as $file) {
                // Delete from Elasticsearch
                try {
                    $this->elasticsearchService->deleteDocument($file->id);
                } catch (\Exception $e) {
                    $elasticsearchErrors++;
                    $this->warn("  ⚠️  Elasticsearch delete failed for file {$file->id}: {$e->getMessage()}");
                }

                // Delete file from storage
                if (Storage::exists($file->filepath)) {
                    Storage::delete($file->filepath);
                }

                // Delete from database
                $file->delete();
                $deletedCount++;
            }

            DB::commit();
            $this->info("✅ Deleted {$deletedCount} files from database");
            if ($elasticsearchErrors > 0) {
                $this->warn("⚠️  {$elasticsearchErrors} Elasticsearch deletion errors");
            }

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("❌ Error deleting files: {$e->getMessage()}");

            return 1;
        }

        // Delete subject profiles
        $deletedProfiles = SubjectProfile::whereIn('subject_name', $subjects)->delete();
        $this->info("✅ Deleted {$deletedProfiles} subject profiles");

        // Delete favorites
        $deletedFavorites = FavoriteSubject::whereIn('subject_name', $subjects)->delete();
        $this->info("✅ Deleted {$deletedFavorites} favorites");

        // Clear all caches
        $this->info('🗑️  Clearing caches...');
        Cache::tags(['files'])->flush();
        Cache::tags(['subjects'])->flush();
        Cache::forget('system:stats:comprehensive');
        Cache::forget('subjects:with_counts');
        Cache::forget('subjects:list');
        $this->info('✅ Caches cleared');

        $this->info('');
        $this->info('✅ Test data cleanup complete!');
        $this->info("   - {$deletedCount} files");
        $this->info("   - {$deletedProfiles} profiles");
        $this->info("   - {$deletedFavorites} favorites");

        return 0;
    }
}
