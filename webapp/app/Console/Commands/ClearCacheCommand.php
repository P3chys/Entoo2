<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Redis;

class ClearCacheCommand extends Command
{
    protected $signature = 'cache:clear-all
                            {--type= : Specific cache type to clear (redis|config|route|view|all)}';

    protected $description = 'Clear all application caches (Redis, config, routes, views)';

    public function handle()
    {
        $type = $this->option('type') ?? 'all';

        $this->info('========================================');
        $this->info('Clear Application Cache');
        $this->info('========================================');
        $this->info('Type: '.strtoupper($type));
        $this->info("========================================\n");

        $cleared = [];

        if ($type === 'all' || $type === 'redis') {
            $this->info('Clearing Redis cache...');
            try {
                Redis::flushdb();
                $this->info('  ✓ Redis cache cleared');
                $cleared[] = 'Redis';
            } catch (\Exception $e) {
                $this->error('  ✗ Failed to clear Redis: '.$e->getMessage());
            }
        }

        if ($type === 'all' || $type === 'config') {
            $this->info('Clearing config cache...');
            Artisan::call('config:clear');
            $this->info('  ✓ Config cache cleared');
            $cleared[] = 'Config';
        }

        if ($type === 'all' || $type === 'route') {
            $this->info('Clearing route cache...');
            Artisan::call('route:clear');
            $this->info('  ✓ Route cache cleared');
            $cleared[] = 'Routes';
        }

        if ($type === 'all' || $type === 'view') {
            $this->info('Clearing view cache...');
            Artisan::call('view:clear');
            $this->info('  ✓ View cache cleared');
            $cleared[] = 'Views';
        }

        // Clear Laravel cache
        if ($type === 'all') {
            $this->info('Clearing Laravel cache...');
            Artisan::call('cache:clear');
            $this->info('  ✓ Laravel cache cleared');
            $cleared[] = 'Laravel cache';
        }

        $this->newLine();
        $this->info('========================================');
        $this->info('✓ Cache cleared: '.implode(', ', $cleared));
        $this->info('========================================');

        return 0;
    }
}
