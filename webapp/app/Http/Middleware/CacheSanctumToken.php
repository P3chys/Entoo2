<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;

class CacheSanctumToken
{
    /**
     * Cache Sanctum token lookups in Redis for better performance
     *
     * Instead of querying PostgreSQL on every request, cache the token->user mapping
     * in Redis for 30 minutes. This dramatically improves API response times.
     *
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // Only process if there's a Bearer token
        $bearerToken = $request->bearerToken();

        if (! $bearerToken) {
            return $next($request);
        }

        // Create a cache key for this token
        $cacheKey = 'sanctum:token:'.hash('sha256', $bearerToken);

        // Try to get the token data from cache
        $cachedData = Cache::remember($cacheKey, 1800, function () use ($bearerToken) {
            // Token not in cache, look it up in database
            $token = PersonalAccessToken::findToken($bearerToken);

            if (! $token || ($token->expires_at && $token->expires_at->isPast())) {
                return null;
            }

            // Note: We skip updating last_used_at when using cached tokens
            // This is an acceptable tradeoff for massive performance gains
            // The timestamp will still update when cache expires (30 min)

            // Cache only the necessary data (NOT the full user object)
            return [
                'tokenable_type' => $token->tokenable_type,
                'tokenable_id' => $token->tokenable_id,
                'expires_at' => $token->expires_at?->toDateTimeString(),
            ];
        });

        // If token not found or expired, clear cache and continue (will fail auth)
        if (! $cachedData) {
            Cache::forget($cacheKey);

            return $next($request);
        }

        // Check if token is expired
        if ($cachedData['expires_at'] && now()->greaterThan(\Carbon\Carbon::parse($cachedData['expires_at']))) {
            Cache::forget($cacheKey);

            return $next($request);
        }

        // Load the user by ID with Redis caching
        // This prevents both the token AND user queries from hitting PostgreSQL
        $userModel = $cachedData['tokenable_type'];
        $userId = $cachedData['tokenable_id'];

        $request->setUserResolver(function () use ($userModel, $userId) {
            // Cache user data in Redis for 30 minutes
            $userCacheKey = "user:model:{$userId}";

            return Cache::remember($userCacheKey, 1800, function () use ($userModel, $userId) {
                return $userModel::find($userId);
            });
        });

        return $next($request);
    }
}
