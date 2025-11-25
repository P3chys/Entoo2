<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogRequest
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        error_log("LogRequest Middleware: " . $request->method() . " " . $request->fullUrl());
        error_log("Headers: " . json_encode($request->headers->all()));
        
        $response = $next($request);
        
        error_log("LogRequest Response Status: " . $response->getStatusCode());
        
        return $response;
    }
}
