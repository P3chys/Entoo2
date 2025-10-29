<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ElasticsearchService;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    private ElasticsearchService $elasticsearchService;

    public function __construct(ElasticsearchService $elasticsearchService)
    {
        $this->elasticsearchService = $elasticsearchService;
    }

    /**
     * Search documents with fuzzy matching
     */
    public function search(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:1',
            'subject_name' => 'sometimes|string|max:200',
            'category' => 'sometimes|string|in:Prednasky,Otazky,Materialy,Seminare',
            'file_extension' => 'sometimes|string|max:10',
            'size' => 'sometimes|integer|min:1|max:100',
        ]);

        $query = $request->input('q');

        $filters = [];
        if ($request->has('subject_name')) {
            $filters['subject_name'] = $request->input('subject_name');
        }
        if ($request->has('category')) {
            $filters['category'] = $request->input('category');
        }
        if ($request->has('file_extension')) {
            $filters['file_extension'] = $request->input('file_extension');
        }

        $size = $request->input('size', 20);

        // Search all files (pass null for userId to search globally)
        $results = $this->elasticsearchService->search($query, null, $filters, $size);

        return response()->json([
            'query' => $query,
            'total' => $results['total'],
            'results' => $results['results'],
        ]);
    }
}
