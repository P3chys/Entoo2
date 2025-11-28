<?php

namespace App\Console\Commands;

use App\Models\FavoriteSubject;
use App\Models\UploadedFile;
use App\Models\User;
use App\Services\ElasticsearchService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ShowSystemStatsCommand extends Command
{
    protected $signature = 'system:stats';

    protected $description = 'Display system statistics (users, files, subjects, index stats)';

    private ElasticsearchService $elasticsearchService;

    public function __construct(ElasticsearchService $elasticsearchService)
    {
        parent::__construct();
        $this->elasticsearchService = $elasticsearchService;
    }

    public function handle()
    {
        $this->info('========================================');
        $this->info('System Statistics');
        $this->info("========================================\n");

        // Database Statistics
        $this->info('Database Statistics:');
        $this->line('  Total Users: '.User::count());
        $this->line('  Total Files: '.UploadedFile::count());
        $this->line('  Total Subjects: '.UploadedFile::distinct('subject_name')->count('subject_name'));
        $this->line('  Total Favorites: '.FavoriteSubject::count());

        $this->newLine();

        // Files by Category
        $this->info('Files by Category:');
        $categories = UploadedFile::select('category', DB::raw('count(*) as count'))
            ->groupBy('category')
            ->orderBy('count', 'desc')
            ->get();

        foreach ($categories as $category) {
            $this->line("  {$category->category}: {$category->count}");
        }

        $this->newLine();

        // Files by Extension
        $this->info('Top File Extensions:');
        $extensions = UploadedFile::select('file_extension', DB::raw('count(*) as count'))
            ->groupBy('file_extension')
            ->orderBy('count', 'desc')
            ->limit(10)
            ->get();

        foreach ($extensions as $extension) {
            $this->line("  {$extension->file_extension}: {$extension->count}");
        }

        $this->newLine();

        // Storage Statistics
        $this->info('Storage Statistics:');
        $totalSize = UploadedFile::sum('file_size');
        $this->line('  Total File Size: '.$this->formatBytes($totalSize));
        $this->line('  Average File Size: '.$this->formatBytes($totalSize / max(UploadedFile::count(), 1)));

        $this->newLine();

        // Top 10 Subjects by File Count
        $this->info('Top 10 Subjects by File Count:');
        $topSubjects = UploadedFile::select('subject_name', DB::raw('count(*) as count'))
            ->groupBy('subject_name')
            ->orderBy('count', 'desc')
            ->limit(10)
            ->get();

        foreach ($topSubjects as $subject) {
            $this->line("  {$subject->subject_name}: {$subject->count}");
        }

        $this->newLine();

        // Elasticsearch Statistics
        $this->info('Elasticsearch Statistics:');
        try {
            if ($this->elasticsearchService->indexExists()) {
                $stats = $this->elasticsearchService->getIndexStats();
                $docCount = $stats['_all']['primaries']['docs']['count'] ?? 0;
                $storeSize = $stats['_all']['primaries']['store']['size_in_bytes'] ?? 0;

                $this->line('  Index Exists: Yes');
                $this->line("  Indexed Documents: {$docCount}");
                $this->line('  Index Size: '.$this->formatBytes($storeSize));
            } else {
                $this->warn('  Index Exists: No');
            }
        } catch (\Exception $e) {
            $this->error('  Error: '.$e->getMessage());
        }

        $this->newLine();
        $this->info('========================================');

        return 0;
    }

    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);

        $bytes /= pow(1024, $pow);

        return round($bytes, $precision).' '.$units[$pow];
    }
}
