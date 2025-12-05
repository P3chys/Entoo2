<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware to ensure user is authenticated
 *
 * This middleware protects web routes with a hybrid approach:
 * 1. Check if request has Authorization header with Bearer token (from JavaScript)
 * 2. Validate the token using Sanctum
 * 3. If valid, set the authenticated user and continue
 * 4. If invalid or missing, serve the page (HTML) which will handle auth check via JavaScript
 *
 * This works because:
 * - Initial page loads: No auth header, serve HTML, JavaScript checks localStorage token
 * - Subsequent requests: JavaScript adds auth header, server validates before serving
 * - API calls: Always have auth header, protected by auth:sanctum middleware
 *
 * The dual approach ensures both server-side and client-side validation.
 */
class EnsureAuthenticated
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Extract token from Authorization header if present
        $authHeader = $request->header('Authorization');

        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);

            // Validate the token using Sanctum
            $accessToken = PersonalAccessToken::findToken($token);

            if ($accessToken && !$accessToken->cant('*')) {
                // Token is valid, set the authenticated user
                Auth::setUser($accessToken->tokenable);

                // Token is valid, allow the request
                return $next($request);
            }

            // Token is invalid, redirect to login
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            return redirect()->guest(route('login'));
        }

        // No Authorization header - check if user is authenticated via session
        // If not authenticated, redirect to login
        if (!Auth::check()) {
            // Store intended URL for redirect after login
            $intendedUrl = $request->url();

            // Redirect to login with the intended URL as a query parameter
            return redirect()->guest(route('login') . '?redirect=' . urlencode($request->getRequestUri()));
        }

        // User is authenticated via session, allow request
        return $next($request);
    }
}
