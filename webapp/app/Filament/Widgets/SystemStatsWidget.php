<?php

namespace App\Filament\Widgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use App\Models\User;
use App\Models\UploadedFile;
use App\Services\ElasticsearchService;
use Illuminate\Support\Facades\Cache;

class SystemStatsWidget extends BaseWidget
{
    protected function getStats(): array
    {
        return Cache::remember('admin.dashboard_stats', 60, function () {
            $users = User::count();
            $files = UploadedFile::count();
            $subjects = UploadedFile::distinct('subject_name')->count('subject_name');

            // Get Elasticsearch stats
            try {
                $elasticsearchService = app(ElasticsearchService::class);
                if ($elasticsearchService->indexExists()) {
                    $stats = $elasticsearchService->getIndexStats();
                    $esDocsCount = $stats['_all']['primaries']['docs']['count'] ?? 0;
                } else {
                    $esDocsCount = 0;
                }
            } catch (\Exception $e) {
                $esDocsCount = 0;
            }

            return [
                Stat::make('Total Users', $users)
                    ->description('Registered users')
                    ->descriptionIcon('heroicon-m-users')
                    ->color('success'),
                Stat::make('Total Files', $files)
                    ->description('Files in system')
                    ->descriptionIcon('heroicon-m-document-text')
                    ->color('info'),
                Stat::make('Subjects', $subjects)
                    ->description('Unique subjects')
                    ->descriptionIcon('heroicon-m-academic-cap')
                    ->color('warning'),
                Stat::make('ES Documents', $esDocsCount)
                    ->description('Indexed in Elasticsearch')
                    ->descriptionIcon('heroicon-m-magnifying-glass')
                    ->color('primary'),
            ];
        });
    }
}
