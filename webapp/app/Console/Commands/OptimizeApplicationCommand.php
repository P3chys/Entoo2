<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class OptimizeApplicationCommand extends Command
{
    protected $signature = 'system:optimize
                            {--clear : Clear caches before optimizing}';

    protected $description = 'Optimize the application (cache config, routes, views)';

    public function handle()
    {
        $clear = $this->option('clear');

        $this->info('========================================');
        $this->info('Optimize Application');
        $this->info("========================================\n");

        // Clear caches first if requested
        if ($clear) {
            $this->info('Clearing caches first...');
            Artisan::call('cache:clear-all');
            $this->info('  ✓ Caches cleared');
            $this->newLine();
        }

        // Cache config
        $this->info('Caching configuration...');
        try {
            Artisan::call('config:cache');
            $this->info('  ✓ Configuration cached');
        } catch (\Exception $e) {
            $this->error('  ✗ Failed to cache config: '.$e->getMessage());
        }

        // Cache routes
        $this->info('Caching routes...');
        try {
            Artisan::call('route:cache');
            $this->info('  ✓ Routes cached');
        } catch (\Exception $e) {
            $this->error('  ✗ Failed to cache routes: '.$e->getMessage());
        }

        // Cache views
        $this->info('Caching views...');
        try {
            Artisan::call('view:cache');
            $this->info('  ✓ Views cached');
        } catch (\Exception $e) {
            $this->error('  ✗ Failed to cache views: '.$e->getMessage());
        }

        // Optimize
        $this->info('Running optimize command...');
        try {
            Artisan::call('optimize');
            $this->info('  ✓ Application optimized');
        } catch (\Exception $e) {
            $this->error('  ✗ Failed to optimize: '.$e->getMessage());
        }

        $this->newLine();
        $this->info('========================================');
        $this->info('✓ Application optimization complete');
        $this->info('========================================');
        $this->newLine();
        $this->warn('Note: If using Laravel Octane, restart the server:');
        $this->line('  docker-compose restart php');

        return 0;
    }
}
