<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Symfony\Component\HttpFoundation\Response;

/**
 * ConditionalThrottle Middleware
 *
 * This middleware conditionally applies rate limiting based on:
 * 1. X-Bypass-Rate-Limit header (for E2E tests)
 * 2. APP_ENV environment (bypasses in testing/local for test users)
 *
 * Usage in routes:
 *   Route::post('/login', [AuthController::class, 'login'])
 *       ->middleware('conditional.throttle:5,1');
 */
class ConditionalThrottle
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, $maxAttempts = 60, $decayMinutes = 1): Response
    {
        // Check if rate limiting should be bypassed
        if ($this->shouldBypassRateLimiting($request)) {
            return $next($request);
        }

        // Apply standard throttle middleware
        $throttle = app(ThrottleRequests::class);
        return $throttle->handle($request, $next, $maxAttempts, $decayMinutes);
    }

    /**
     * Determine if rate limiting should be bypassed.
     */
    protected function shouldBypassRateLimiting(Request $request): bool
    {
        // Bypass if X-Bypass-Rate-Limit header is present with correct value
        if ($request->hasHeader('X-Bypass-Rate-Limit')) {
            $bypassToken = $request->header('X-Bypass-Rate-Limit');
            $expectedToken = config('app.rate_limit_bypass_token', 'test-bypass-token-2024');

            if ($bypassToken === $expectedToken) {
                return true;
            }
        }

        // Bypass in testing environment
        if (app()->environment('testing')) {
            return true;
        }

        // Optionally bypass in local environment for test users
        // (You can add additional checks here, like checking for a test user email pattern)
        if (app()->environment('local')) {
            $email = $request->input('email', '');

            // Bypass for test users (emails containing 'test@' or ending with '@test.entoo.cz')
            if (
                str_contains($email, 'test@') ||
                str_ends_with($email, '@test.entoo.cz') ||
                str_contains($email, 'ratelimit-test') ||
                str_contains($email, 'playwright-test')
            ) {
                return true;
            }
        }

        return false;
    }
}
