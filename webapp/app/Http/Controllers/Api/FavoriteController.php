<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FavoriteSubject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class FavoriteController extends Controller
{
    /**
     * Get all favorite subjects for user
     * Cached for 30 minutes per user for better performance
     */
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

    /**
     * Add subject to favorites
     */
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

    /**
     * Remove subject from favorites
     */
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
