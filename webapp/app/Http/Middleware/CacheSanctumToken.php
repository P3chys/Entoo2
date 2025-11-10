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
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // Only process if there's a Bearer token
        $bearerToken = $request->bearerToken();

        if (!$bearerToken) {
            return $next($request);
        }

        // Create a cache key for this token
        $cacheKey = 'sanctum:token:' . hash('sha256', $bearerToken);

        // Try to get the tokenable (user) from cache
        $cachedData = Cache::remember($cacheKey, 1800, function () use ($bearerToken) {
            // Token not in cache, look it up in database
            $token = PersonalAccessToken::findToken($bearerToken);

            if (!$token || ($token->expires_at && $token->expires_at->isPast())) {
                return null;
            }

            // Update last_used_at timestamp (don't cache this update)
            $token->forceFill(['last_used_at' => now()])->save();

            // Cache the tokenable (user) data
            return [
                'tokenable_type' => $token->tokenable_type,
                'tokenable_id' => $token->tokenable_id,
                'tokenable' => $token->tokenable, // Eager load the user
                'expires_at' => $token->expires_at,
            ];
        });

        // If token not found or expired, clear cache and continue (will fail auth)
        if (!$cachedData) {
            Cache::forget($cacheKey);
            return $next($request);
        }

        // Check if token is expired
        if ($cachedData['expires_at'] && now()->greaterThan($cachedData['expires_at'])) {
            Cache::forget($cacheKey);
            return $next($request);
        }

        // Set the authenticated user from cache
        // This prevents Sanctum from hitting the database again
        if (isset($cachedData['tokenable'])) {
            $request->setUserResolver(function () use ($cachedData) {
                return $cachedData['tokenable'];
            });
        }

        return $next($request);
    }
}
