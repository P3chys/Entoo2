<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\ElasticsearchService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class WarmDashboardCache extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cache:warm-dashboard';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Warm up all dashboard-related caches for optimal performance';

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
        $this->info('Warming dashboard caches...');
        $overallStart = microtime(true);

        try {
            // 1. Warm stats cache
            $this->info('  [1/2] Warming stats cache...');
            $start = microtime(true);

            Cache::forget('system:stats:comprehensive');
            $stats = Cache::remember('system:stats:comprehensive', 1800, function () {
                $esStats = $this->elasticsearchService->getComprehensiveStats();
                $esStats['total_users'] = User::count();
                $esStats['cached_at'] = now()->toIso8601String();

                return $esStats;
            });

            $elapsed = round((microtime(true) - $start) * 1000, 2);
            $this->line("    ✓ Stats cached in {$elapsed}ms");
            $this->line('      - Files: '.number_format($stats['total_files']));
            $this->line('      - Subjects: '.number_format($stats['total_subjects']));
            $this->line('      - Users: '.number_format($stats['total_users']));

            // 2. Warm subjects with counts cache
            $this->info('  [2/2] Warming subjects cache...');
            $start = microtime(true);

            Cache::forget('subjects:with_counts');
            $subjects = Cache::remember('subjects:with_counts', 1800, function () {
                return $this->elasticsearchService->getSubjectsWithCounts();
            });

            $elapsed = round((microtime(true) - $start) * 1000, 2);
            $this->line("    ✓ Subjects cached in {$elapsed}ms");
            $this->line('      - Total subjects: '.count($subjects));

            $totalElapsed = round((microtime(true) - $overallStart) * 1000, 2);
            $this->newLine();
            $this->info("✓ Dashboard caches warmed successfully in {$totalElapsed}ms total");
            $this->line('  Cache expires: '.now()->addSeconds(1800)->diffForHumans());

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to warm dashboard caches: '.$e->getMessage());

            return Command::FAILURE;
        }
    }
}
