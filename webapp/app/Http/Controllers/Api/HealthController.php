<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UploadedFile;
use App\Models\User;
use App\Services\ElasticsearchService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

class HealthController extends Controller
{
    private ElasticsearchService $elasticsearchService;

    public function __construct(ElasticsearchService $elasticsearchService)
    {
        $this->elasticsearchService = $elasticsearchService;
    }

    #[OA\Get(
        path: '/api/health',
        summary: 'Check system health',
        description: 'Returns the health status of the application and its dependencies (database, Elasticsearch).',
        tags: ['Health'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Health check response',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'string', enum: ['ok', 'degraded'], example: 'ok'),
                        new OA\Property(property: 'timestamp', type: 'string', format: 'date-time', example: '2024-01-15T10:30:00+00:00'),
                        new OA\Property(
                            property: 'services',
                            type: 'object',
                            properties: [
                                new OA\Property(property: 'database', type: 'string', enum: ['connected', 'error'], example: 'connected'),
                                new OA\Property(property: 'elasticsearch', type: 'string', enum: ['connected', 'unreachable', 'error'], example: 'connected'),
                            ]
                        ),
                    ]
                )
            ),
        ]
    )]
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

    #[OA\Get(
        path: '/api/stats',
        summary: 'Get system statistics',
        description: 'Returns comprehensive system statistics including file counts, storage usage, and user counts. Cached for 30 minutes. Uses Elasticsearch for fast aggregations.',
        tags: ['Health'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'System statistics',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'total_files', type: 'integer', example: 1250),
                        new OA\Property(property: 'total_users', type: 'integer', example: 42),
                        new OA\Property(property: 'total_subjects', type: 'integer', example: 35),
                        new OA\Property(property: 'total_storage_bytes', type: 'integer', example: 524288000),
                        new OA\Property(property: 'total_storage_formatted', type: 'string', example: '500 MB'),
                        new OA\Property(
                            property: 'files_by_category',
                            type: 'object',
                            example: ['Materialy' => 400, 'Prednasky' => 350, 'Otazky' => 300, 'Seminare' => 200]
                        ),
                        new OA\Property(
                            property: 'files_by_extension',
                            type: 'object',
                            example: ['pdf' => 800, 'docx' => 250, 'pptx' => 150, 'txt' => 50]
                        ),
                        new OA\Property(
                            property: 'top_subjects',
                            type: 'array',
                            items: new OA\Items(
                                type: 'object',
                                properties: [
                                    new OA\Property(property: 'subject_name', type: 'string'),
                                    new OA\Property(property: 'file_count', type: 'integer'),
                                ]
                            )
                        ),
                        new OA\Property(property: 'cached_at', type: 'string', format: 'date-time', example: '2024-01-15T10:30:00+00:00'),
                    ]
                )
            ),
        ]
    )]
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
