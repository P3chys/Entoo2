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
            'admin' => \App\Http\Middleware\IsAdmin::class,
        ]);

        // Add global logging middleware
        $middleware->append(\App\Http\Middleware\LogRequest::class);

        // Note: CacheSanctumToken middleware temporarily disabled due to Octane compatibility issues
        // causing 403 errors on authenticated routes. Need to implement proper Sanctum + Octane caching.
        // $middleware->prependToGroup('api', \App\Http\Middleware\CacheSanctumToken::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
