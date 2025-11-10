<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use App\Services\ElasticsearchService;
use App\Models\User;
use App\Models\UploadedFile;
use App\Models\FavoriteSubject;

class SystemManagement extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-cog-6-tooth';

    protected static string $view = 'filament.pages.system-management';

    protected static ?string $navigationGroup = 'Administration';

    protected static ?int $navigationSort = 10;

    protected static ?string $title = 'System Management';

    protected static ?string $navigationLabel = 'System Management';

    public static function shouldRegisterNavigation(): bool
    {
        return true;
    }

    public static function canAccess(): bool
    {
        return true; // Allow access for testing
    }

    public $healthStatus = [];
    public $systemStats = [];

    public function mount(): void
    {
        try {
            // Load from cache if available (30 seconds TTL)
            $this->healthStatus = \Cache::remember('admin.health_status', 30, function () {
                $status = [
                    'database' => ['status' => 'unknown', 'message' => 'Not checked'],
                    'redis' => ['status' => 'unknown', 'message' => 'Not checked'],
                    'elasticsearch' => ['status' => 'unknown', 'message' => 'Not checked'],
                ];
                $this->loadHealthStatusInternal($status);
                return $status;
            });

            $this->systemStats = \Cache::remember('admin.system_stats', 60, function () {
                return $this->loadSystemStatsInternal();
            });
        } catch (\Exception $e) {
            \Log::error('SystemManagement mount error: ' . $e->getMessage());
            $this->healthStatus = [
                'database' => ['status' => 'unknown', 'message' => 'Not checked'],
                'redis' => ['status' => 'unknown', 'message' => 'Not checked'],
                'elasticsearch' => ['status' => 'unknown', 'message' => 'Not checked'],
            ];
            $this->systemStats = [
                'users' => 0,
                'files' => 0,
                'subjects' => 0,
                'favorites' => 0,
                'total_size' => '0 B',
                'es_docs' => 0,
                'es_size' => '0 B',
            ];
        }
    }

    public function loadHealthStatus(): void
    {
        \Cache::forget('admin.health_status');
        $this->loadHealthStatusInternal($this->healthStatus);
    }

    private function loadHealthStatusInternal(array &$status): void
    {
        $elasticsearchService = app(ElasticsearchService::class);

        // Check PostgreSQL
        try {
            DB::connection()->getPdo();
            $status['database'] = [
                'status' => 'healthy',
                'message' => 'PostgreSQL is connected'
            ];
        } catch (\Exception $e) {
            $status['database'] = [
                'status' => 'unhealthy',
                'message' => 'PostgreSQL connection failed: ' . $e->getMessage()
            ];
        }

        // Check Redis
        try {
            Redis::ping();
            $status['redis'] = [
                'status' => 'healthy',
                'message' => 'Redis is connected'
            ];
        } catch (\Exception $e) {
            $status['redis'] = [
                'status' => 'unhealthy',
                'message' => 'Redis connection failed: ' . $e->getMessage()
            ];
        }

        // Check Elasticsearch
        try {
            if ($elasticsearchService->ping()) {
                $indexExists = $elasticsearchService->indexExists();
                $status['elasticsearch'] = [
                    'status' => $indexExists ? 'healthy' : 'warning',
                    'message' => $indexExists ? 'Elasticsearch is connected and index exists' : 'Elasticsearch is connected but index is missing'
                ];
            } else {
                $status['elasticsearch'] = [
                    'status' => 'unhealthy',
                    'message' => 'Elasticsearch ping failed'
                ];
            }
        } catch (\Exception $e) {
            $status['elasticsearch'] = [
                'status' => 'unhealthy',
                'message' => 'Elasticsearch connection failed: ' . $e->getMessage()
            ];
        }
    }

    public function loadSystemStats(): void
    {
        \Cache::forget('admin.system_stats');
        $this->systemStats = $this->loadSystemStatsInternal();
    }

    private function loadSystemStatsInternal(): array
    {
        $stats = [];
        $stats['users'] = User::count();
        $stats['files'] = UploadedFile::count();
        $stats['subjects'] = UploadedFile::distinct('subject_name')->count('subject_name');
        $stats['favorites'] = FavoriteSubject::count();

        $totalSize = UploadedFile::sum('file_size');
        $stats['total_size'] = $this->formatBytes($totalSize);

        // Get Elasticsearch stats
        try {
            $elasticsearchService = app(ElasticsearchService::class);
            if ($elasticsearchService->indexExists()) {
                $esStats = $elasticsearchService->getIndexStats();
                $stats['es_docs'] = $esStats['_all']['primaries']['docs']['count'] ?? 0;
                $stats['es_size'] = $this->formatBytes($esStats['_all']['primaries']['store']['size_in_bytes'] ?? 0);
            } else {
                $stats['es_docs'] = 0;
                $stats['es_size'] = '0 B';
            }
        } catch (\Exception $e) {
            $stats['es_docs'] = 'Error';
            $stats['es_size'] = 'Error';
        }

        return $stats;
    }

    public function clearCache(): void
    {
        try {
            Artisan::call('cache:clear-all');

            Notification::make()
                ->title('Cache Cleared')
                ->success()
                ->body('All application caches have been cleared successfully.')
                ->send();

            $this->loadHealthStatus();
        } catch (\Exception $e) {
            Notification::make()
                ->title('Cache Clear Failed')
                ->danger()
                ->body('Error: ' . $e->getMessage())
                ->send();
        }
    }

    public function optimizeApplication(): void
    {
        try {
            Artisan::call('system:optimize', ['--clear' => true]);

            Notification::make()
                ->title('Application Optimized')
                ->success()
                ->body('Application has been optimized. Remember to restart Laravel Octane if needed.')
                ->send();

            $this->loadHealthStatus();
        } catch (\Exception $e) {
            Notification::make()
                ->title('Optimization Failed')
                ->danger()
                ->body('Error: ' . $e->getMessage())
                ->send();
        }
    }

    public function initializeElasticsearch(): void
    {
        try {
            Artisan::call('elasticsearch:init');

            Notification::make()
                ->title('Elasticsearch Initialized')
                ->success()
                ->body('Elasticsearch index has been initialized successfully.')
                ->send();

            $this->loadHealthStatus();
            $this->loadSystemStats();
        } catch (\Exception $e) {
            Notification::make()
                ->title('Initialization Failed')
                ->danger()
                ->body('Error: ' . $e->getMessage())
                ->send();
        }
    }

    public function reindexElasticsearch(): void
    {
        try {
            Artisan::call('elasticsearch:reindex', ['--batch-size' => 100]);

            Notification::make()
                ->title('Reindexing Started')
                ->success()
                ->body('Elasticsearch reindexing has been started. This may take a while for large datasets.')
                ->send();

            $this->loadSystemStats();
        } catch (\Exception $e) {
            Notification::make()
                ->title('Reindexing Failed')
                ->danger()
                ->body('Error: ' . $e->getMessage())
                ->send();
        }
    }

    public function runHealthCheck(): void
    {
        try {
            Artisan::call('system:health-check');
            \Cache::forget('admin.health_status');
            $this->loadHealthStatusInternal($this->healthStatus);

            Notification::make()
                ->title('Health Check Complete')
                ->success()
                ->body('System health check has been completed.')
                ->send();
        } catch (\Exception $e) {
            Notification::make()
                ->title('Health Check Failed')
                ->danger()
                ->body('Error: ' . $e->getMessage())
                ->send();
        }
    }

    public function refreshStats(): void
    {
        \Cache::forget('admin.health_status');
        \Cache::forget('admin.system_stats');
        $this->loadHealthStatusInternal($this->healthStatus);
        $this->systemStats = $this->loadSystemStatsInternal();

        Notification::make()
            ->title('Stats Refreshed')
            ->success()
            ->body('System statistics have been refreshed.')
            ->send();
    }

    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);

        $bytes /= pow(1024, $pow);

        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}
