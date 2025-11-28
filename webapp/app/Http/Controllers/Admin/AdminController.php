<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FavoriteSubject;
use App\Models\UploadedFile;
use App\Models\User;
use App\Services\ElasticsearchService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class AdminController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index()
    {
        $stats = Cache::remember('admin.dashboard_stats', 60, function () {
            return [
                'users' => User::count(),
                'files' => UploadedFile::count(),
                'subjects' => UploadedFile::distinct('subject_name')->count('subject_name'),
                'favorites' => FavoriteSubject::count(),
                'total_size' => $this->formatBytes(UploadedFile::sum('file_size')),
            ];
        });

        $health = Cache::remember('admin.health_status', 30, function () {
            return [
                'database' => $this->checkDatabase(),
                'redis' => $this->checkRedis(),
                'elasticsearch' => $this->checkElasticsearch(),
            ];
        });

        return view('admin.index', compact('stats', 'health'));
    }

    public function users()
    {
        $users = User::orderBy('created_at', 'desc')->paginate(50);

        return view('admin.users', compact('users'));
    }

    public function files()
    {
        $files = UploadedFile::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return view('admin.files', compact('files'));
    }

    private function checkDatabase(): array
    {
        try {
            DB::connection()->getPdo();

            return ['status' => 'healthy', 'message' => 'Connected'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'Connection failed'];
        }
    }

    private function checkRedis(): array
    {
        try {
            Redis::ping();

            return ['status' => 'healthy', 'message' => 'Connected'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'Connection failed'];
        }
    }

    private function checkElasticsearch(): array
    {
        try {
            $es = app(ElasticsearchService::class);
            if ($es->ping()) {
                $indexExists = $es->indexExists();

                return [
                    'status' => $indexExists ? 'healthy' : 'warning',
                    'message' => $indexExists ? 'Connected & indexed' : 'Connected, no index',
                ];
            }

            return ['status' => 'error', 'message' => 'Ping failed'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'Connection failed'];
        }
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
