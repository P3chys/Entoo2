<?php

namespace App\Console\Commands;

use App\Services\ElasticsearchService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class HealthCheckCommand extends Command
{
    protected $signature = 'system:health-check';

    protected $description = 'Check health status of all services (Database, Redis, Elasticsearch)';

    private ElasticsearchService $elasticsearchService;

    public function __construct(ElasticsearchService $elasticsearchService)
    {
        parent::__construct();
        $this->elasticsearchService = $elasticsearchService;
    }

    public function handle()
    {
        $this->info('========================================');
        $this->info('System Health Check');
        $this->info("========================================\n");

        $allHealthy = true;

        // Check PostgreSQL
        $this->info('Checking PostgreSQL...');
        try {
            DB::connection()->getPdo();
            $version = DB::select('SELECT version()')[0]->version ?? 'Unknown';
            $this->info('  ✓ PostgreSQL is connected');
            $this->line('    Version: '.substr($version, 0, 50));
        } catch (\Exception $e) {
            $this->error('  ✗ PostgreSQL connection failed: '.$e->getMessage());
            $allHealthy = false;
        }

        $this->newLine();

        // Check Redis
        $this->info('Checking Redis...');
        try {
            Redis::ping();
            $info = Redis::info();
            $version = $info['redis_version'] ?? 'Unknown';
            $this->info('  ✓ Redis is connected');
            $this->line('    Version: '.$version);
            $this->line('    Memory: '.($info['used_memory_human'] ?? 'Unknown'));
        } catch (\Exception $e) {
            $this->error('  ✗ Redis connection failed: '.$e->getMessage());
            $allHealthy = false;
        }

        $this->newLine();

        // Check Elasticsearch
        $this->info('Checking Elasticsearch...');
        try {
            if ($this->elasticsearchService->ping()) {
                $info = $this->elasticsearchService->getInfo();
                $this->info('  ✓ Elasticsearch is connected');
                $this->line('    Version: '.($info['version']['number'] ?? 'Unknown'));
                $this->line('    Cluster: '.($info['cluster_name'] ?? 'Unknown'));

                // Check index
                $indexExists = $this->elasticsearchService->indexExists();
                if ($indexExists) {
                    $this->info("  ✓ Index 'entoo_documents' exists");
                } else {
                    $this->warn("  ⚠ Index 'entoo_documents' does not exist");
                }
            } else {
                $this->error('  ✗ Elasticsearch ping failed');
                $allHealthy = false;
            }
        } catch (\Exception $e) {
            $this->error('  ✗ Elasticsearch connection failed: '.$e->getMessage());
            $allHealthy = false;
        }

        $this->newLine();
        $this->info('========================================');

        if ($allHealthy) {
            $this->info('✓ All services are healthy');
        } else {
            $this->error('✗ Some services are unhealthy');
        }

        $this->info('========================================');

        return $allHealthy ? 0 : 1;
    }
}
