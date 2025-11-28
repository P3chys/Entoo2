<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\ElasticsearchService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class WarmStatsCache extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cache:warm-stats';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Warm up the system stats cache to improve API response times';

    private ElasticsearchService $elasticsearchService;

    public function __construct(ElasticsearchService $elasticsearchService)
    {
        parent::__construct();
        $this->elasticsearchService = $elasticsearchService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Warming stats cache...');

        $startTime = microtime(true);

        try {
            // Force cache refresh by forgetting the old value first
            Cache::forget('system:stats:comprehensive');

            // Generate fresh stats
            $stats = Cache::remember('system:stats:comprehensive', 1800, function () {
                $esStats = $this->elasticsearchService->getComprehensiveStats();
                $esStats['total_users'] = User::count();
                $esStats['cached_at'] = now()->toIso8601String();

                return $esStats;
            });

            $elapsed = round((microtime(true) - $startTime) * 1000, 2);

            $this->info("✓ Stats cache warmed successfully in {$elapsed}ms");
            $this->line('  - Total files: '.number_format($stats['total_files']));
            $this->line('  - Total subjects: '.number_format($stats['total_subjects']));
            $this->line('  - Total users: '.number_format($stats['total_users']));
            $this->line('  - Storage: '.$this->formatBytes($stats['total_storage_bytes']));
            $this->line('  - Cache expires: '.now()->addSeconds(1800)->diffForHumans());

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to warm stats cache: '.$e->getMessage());

            return Command::FAILURE;
        }
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= (1 << (10 * $pow));

        return round($bytes, 2).' '.$units[$pow];
    }
}
