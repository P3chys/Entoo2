<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ElasticsearchService;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class SearchController extends Controller
{
    private ElasticsearchService $elasticsearchService;

    public function __construct(ElasticsearchService $elasticsearchService)
    {
        $this->elasticsearchService = $elasticsearchService;
    }

    #[OA\Get(
        path: '/api/search',
        summary: 'Search documents with fuzzy matching',
        description: 'Full-text search across all documents using Elasticsearch. Supports fuzzy matching, filtering by subject, category, and file type.',
        security: [['sanctum' => []]],
        tags: ['Search'],
        parameters: [
            new OA\Parameter(name: 'q', in: 'query', required: true, schema: new OA\Schema(type: 'string', minLength: 1), description: 'Search query'),
            new OA\Parameter(name: 'subject_name', in: 'query', required: false, schema: new OA\Schema(type: 'string', maxLength: 200), description: 'Filter by subject name'),
            new OA\Parameter(name: 'category', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['Prednasky', 'Otazky', 'Materialy', 'Seminare']), description: 'Filter by category'),
            new OA\Parameter(name: 'file_extension', in: 'query', required: false, schema: new OA\Schema(type: 'string', maxLength: 10), description: 'Filter by file extension (pdf, doc, etc)'),
            new OA\Parameter(name: 'size', in: 'query', required: false, schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 20), description: 'Number of results to return'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Search results',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'query', type: 'string', example: 'algoritmy'),
                        new OA\Property(property: 'total', type: 'integer', example: 42),
                        new OA\Property(
                            property: 'results',
                            type: 'array',
                            items: new OA\Items(
                                type: 'object',
                                properties: [
                                    new OA\Property(property: 'id', type: 'integer'),
                                    new OA\Property(property: 'filename', type: 'string'),
                                    new OA\Property(property: 'subject_name', type: 'string'),
                                    new OA\Property(property: 'category', type: 'string'),
                                    new OA\Property(property: 'score', type: 'number'),
                                ]
                            )
                        ),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Validation error'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
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
