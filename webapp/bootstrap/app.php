<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Register custom middleware aliases
        $middleware->alias([
            'conditional.throttle' => \App\Http\Middleware\ConditionalThrottle::class,
        ]);

        // Add token caching middleware to API routes for better performance
        // This caches Sanctum token lookups in Redis instead of hitting PostgreSQL on every request
        $middleware->prependToGroup('api', \App\Http\Middleware\CacheSanctumToken::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
