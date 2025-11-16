<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FavoriteSubject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use OpenApi\Attributes as OA;

class FavoriteController extends Controller
{
    #[OA\Get(
        path: '/api/favorites',
        summary: 'Get all favorite subjects for authenticated user',
        description: 'Returns list of favorite subjects for the current user. Cached for 30 minutes.',
        security: [['sanctum' => []]],
        tags: ['Favorites'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Favorites list',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'favorites',
                            type: 'array',
                            items: new OA\Items(
                                type: 'object',
                                properties: [
                                    new OA\Property(property: 'id', type: 'integer', example: 1),
                                    new OA\Property(property: 'user_id', type: 'integer', example: 1),
                                    new OA\Property(property: 'subject_name', type: 'string', example: 'Matematická analýza'),
                                    new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
                                ]
                            )
                        ),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $cacheKey = "favorites:user:{$userId}";

        $favorites = Cache::remember($cacheKey, 1800, function () use ($userId) {
            return FavoriteSubject::where('user_id', $userId)
                ->orderBy('subject_name')
                ->get();
        });

        // Add HTTP cache headers for client-side caching (5 minutes)
        return response()->json(['favorites' => $favorites])
            ->header('Cache-Control', 'private, max-age=300');
    }

    #[OA\Post(
        path: '/api/favorites',
        summary: 'Add subject to favorites',
        description: 'Adds a subject to the authenticated user\'s favorites. Returns existing favorite if already exists.',
        security: [['sanctum' => []]],
        tags: ['Favorites'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['subject_name'],
                properties: [
                    new OA\Property(property: 'subject_name', type: 'string', maxLength: 200, example: 'Matematická analýza'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Subject added to favorites',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Subject added to favorites'),
                        new OA\Property(property: 'favorite', type: 'object'),
                    ]
                )
            ),
            new OA\Response(
                response: 200,
                description: 'Subject already in favorites',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Subject already in favorites'),
                        new OA\Property(property: 'favorite', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Validation error'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function store(Request $request)
    {
        $validated = $request->validate([
            'subject_name' => 'required|string|max:200',
        ]);

        $userId = $request->user()->id;

        // Check if already favorited
        $existing = FavoriteSubject::where('user_id', $userId)
            ->where('subject_name', $validated['subject_name'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Subject already in favorites',
                'favorite' => $existing
            ], 200);
        }

        $favorite = FavoriteSubject::create([
            'user_id' => $userId,
            'subject_name' => $validated['subject_name'],
        ]);

        // Clear user's favorites cache
        Cache::forget("favorites:user:{$userId}");

        return response()->json([
            'message' => 'Subject added to favorites',
            'favorite' => $favorite
        ], 201);
    }

    #[OA\Delete(
        path: '/api/favorites/{id}',
        summary: 'Remove subject from favorites',
        description: 'Removes a subject from the authenticated user\'s favorites.',
        security: [['sanctum' => []]],
        tags: ['Favorites'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'Favorite ID'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Subject removed from favorites',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Subject removed from favorites'),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Favorite not found'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function destroy(Request $request, int $id)
    {
        $userId = $request->user()->id;

        $favorite = FavoriteSubject::where('user_id', $userId)
            ->findOrFail($id);

        $favorite->delete();

        // Clear user's favorites cache
        Cache::forget("favorites:user:{$userId}");

        return response()->json([
            'message' => 'Subject removed from favorites'
        ]);
    }
}
