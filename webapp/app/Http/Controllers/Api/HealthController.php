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
     * Cached for 30 minutes for better performance
     * Uses Elasticsearch for much faster aggregations
     */
    public function stats()
    {
        // Use simple cache key without tags for better performance in Octane
        // Cache for 30 minutes (1800 seconds) since stats don't change frequently
        $stats = Cache::remember('system:stats:comprehensive', 1800, function () {
            // Use Elasticsearch for super fast stats - much faster than PostgreSQL!
            $esStats = $this->elasticsearchService->getComprehensiveStats();

            // Only get user count from PostgreSQL (small table)
            $esStats['total_users'] = User::count();

            // Add timestamp to show when cache was generated
            $esStats['cached_at'] = now()->toIso8601String();

            return $esStats;
        });

        // Add HTTP cache headers for client-side caching (5 minutes)
        return response()->json($stats)
            ->header('Cache-Control', 'public, max-age=300')
            ->header('X-Cache-Generated', $stats['cached_at'] ?? 'unknown');
    }
}
