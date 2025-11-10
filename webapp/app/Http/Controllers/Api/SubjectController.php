<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UploadedFile;
use App\Services\ElasticsearchService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SubjectController extends Controller
{
    private ElasticsearchService $elasticsearchService;

    public function __construct(ElasticsearchService $elasticsearchService)
    {
        $this->elasticsearchService = $elasticsearchService;
    }
    /**
     * Get all unique subjects (visible to all authenticated users)
     * Cached for 30 minutes for better performance
     * Uses Elasticsearch for much faster performance
     */
    public function index(Request $request)
    {
        $withCounts = $request->boolean('with_counts', false);

        if ($withCounts) {
            // Use Elasticsearch - MUCH faster than PostgreSQL!
            // Use simple cache key without tags for better Octane performance
            $subjects = Cache::remember('subjects:with_counts', 1800, function () {
                return $this->elasticsearchService->getSubjectsWithCounts();
            });

            return response()->json(['subjects' => $subjects])
                ->header('Cache-Control', 'public, max-age=300');
        }

        $subjects = Cache::remember('subjects:list', 1800, function () {
            return UploadedFile::select('subject_name')
                ->groupBy('subject_name')
                ->orderBy('subject_name')
                ->get()
                ->pluck('subject_name');
        });

        return response()->json(['subjects' => $subjects])
            ->header('Cache-Control', 'public, max-age=300');
    }

    /**
     * Get categories and file counts for a subject
     * Always returns all valid categories, even if empty
     * Cached for 5 minutes per subject
     */
    public function show(Request $request, string $subjectName)
    {
        $cacheKey = 'subject:' . md5($subjectName) . ':categories';

        $categories = Cache::tags(['subjects', 'files'])->remember($cacheKey, 300, function () use ($subjectName) {
            // Define all valid categories
            $allCategories = ['Materialy', 'Otazky', 'Prednasky', 'Seminare'];

            // Get actual file counts per category
            $categoryCounts = UploadedFile::where('subject_name', $subjectName)
                ->select('category', DB::raw('count(*) as file_count'))
                ->groupBy('category')
                ->get()
                ->keyBy('category');

            // Build response with all categories, filling in zeros for empty ones
            return collect($allCategories)->map(function ($category) use ($categoryCounts) {
                return [
                    'category' => $category,
                    'file_count' => $categoryCounts->has($category)
                        ? $categoryCounts->get($category)->file_count
                        : 0
                ];
            });
        });

        return response()->json([
            'subject_name' => $subjectName,
            'categories' => $categories
        ]);
    }

    /**
     * Get available categories
     */
    public function categories(Request $request)
    {
        $categories = ['Prednasky', 'Otazky', 'Materialy', 'Seminare'];

        return response()->json(['categories' => $categories]);
    }
}
