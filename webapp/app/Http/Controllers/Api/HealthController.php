<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UploadedFile;
use App\Models\User;
use App\Services\ElasticsearchService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    private ElasticsearchService $elasticsearchService;

    public function __construct(ElasticsearchService $elasticsearchService)
    {
        $this->elasticsearchService = $elasticsearchService;
    }

    /**
     * Check system health
     */
    public function check()
    {
        $health = [
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
            'services' => []
        ];

        // Check database
        try {
            DB::connection()->getPdo();
            $health['services']['database'] = 'connected';
        } catch (\Exception $e) {
            $health['services']['database'] = 'error';
            $health['status'] = 'degraded';
        }

        // Check Elasticsearch
        try {
            $ping = $this->elasticsearchService->ping();
            $health['services']['elasticsearch'] = $ping ? 'connected' : 'unreachable';
            if (!$ping) {
                $health['status'] = 'degraded';
            }
        } catch (\Exception $e) {
            $health['services']['elasticsearch'] = 'error';
            $health['status'] = 'degraded';
        }

        return response()->json($health);
    }

    /**
     * Get system statistics
     * Cached for 5 minutes for better performance
     * Uses Elasticsearch for much faster aggregations
     */
    public function stats()
    {
        $stats = Cache::tags(['stats', 'files'])->remember('stats:all:es', 300, function () {
            // Use Elasticsearch for super fast stats - much faster than PostgreSQL!
            $esStats = $this->elasticsearchService->getComprehensiveStats();

            // Only get user count from PostgreSQL (small table)
            $esStats['total_users'] = User::count();

            return $esStats;
        });

        return response()->json($stats);
    }
}
