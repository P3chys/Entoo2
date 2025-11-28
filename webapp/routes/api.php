<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\SubjectController;
use Illuminate\Support\Facades\Route;

\Log::info('API Route file loaded');
if (request()->is('api/files/*') && request()->method() === 'DELETE') {
    error_log('DELETE request to api/files detected in routes/api.php URL: '.request()->fullUrl());
    \Log::info('DELETE request to api/files detected in routes/api.php', [
        'url' => request()->fullUrl(),
        'user_id' => request()->user()?->id ?? 'null',
        'ip' => request()->ip(),
    ]);
}

// Public routes with rate limiting for security
// Uses conditional.throttle middleware that can be bypassed for tests
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('conditional.throttle:3,1'); // 3 attempts per minute
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('conditional.throttle:5,1'); // 5 attempts per minute
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
    ->middleware('conditional.throttle:3,10'); // 3 attempts per 10 minutes
Route::post('/reset-password', [AuthController::class, 'resetPassword'])
    ->middleware('conditional.throttle:5,10'); // 5 attempts per 10 minutes

// Health check (public)
Route::get('/health', [HealthController::class, 'check']);

// Public browsing routes (no auth required)
Route::get('/subjects', [SubjectController::class, 'index']);
Route::get('/subjects/categories', [SubjectController::class, 'categories']);
Route::get('/subjects/{subjectName}', [SubjectController::class, 'show']);
Route::get('/files', [FileController::class, 'index']);
Route::get('/files/browse', [FileController::class, 'browse']);
Route::get('/search', [SearchController::class, 'search']);

// Subject profiles (public read)
Route::get('/subject-profiles', [\App\Http\Controllers\Api\SubjectProfileController::class, 'index']);
Route::get('/subject-profiles/{subjectName}', [\App\Http\Controllers\Api\SubjectProfileController::class, 'show']);

// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // File management (upload, delete)
    Route::post('/files', [FileController::class, 'store']);
    Route::get('/files/{id}', [FileController::class, 'show']);
    Route::get('/files/{id}/status', [FileController::class, 'status']);
    Route::get('/files/{id}/download', [FileController::class, 'download']);
    Route::delete('/files/{id}', [FileController::class, 'destroy']);

    // Favorites
    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites', [FavoriteController::class, 'store']);
    Route::delete('/favorites/{id}', [FavoriteController::class, 'destroy']);

    // Stats
    Route::get('/stats', [HealthController::class, 'stats']);

    // Subject profiles (authenticated create/update/delete)
    Route::post('/subject-profiles', [\App\Http\Controllers\Api\SubjectProfileController::class, 'store']);
    Route::put('/subject-profiles/{subjectName}', [\App\Http\Controllers\Api\SubjectProfileController::class, 'update']);
    Route::delete('/subject-profiles/{subjectName}', [\App\Http\Controllers\Api\SubjectProfileController::class, 'destroy']);
});

// Admin routes (require authentication + admin role)
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    // Dashboard stats
    Route::get('/stats', [AdminController::class, 'getStats']);

    // User management
    Route::get('/users', [AdminController::class, 'getUsers']);
    Route::post('/users', [AdminController::class, 'createUser']);
    Route::put('/users/{user}', [AdminController::class, 'updateUser']);
    Route::delete('/users/{user}', [AdminController::class, 'deleteUser']);

    // File management
    Route::get('/files', [AdminController::class, 'getFiles']);
    Route::delete('/files/{file}', [AdminController::class, 'deleteFile']);

    // Subject management
    Route::get('/subjects', [\App\Http\Controllers\Api\AdminSubjectController::class, 'index']);
    Route::post('/subjects', [\App\Http\Controllers\Api\AdminSubjectController::class, 'store']);
    Route::put('/subjects/{id}', [\App\Http\Controllers\Api\AdminSubjectController::class, 'update']);
    Route::delete('/subjects/{id}', [\App\Http\Controllers\Api\AdminSubjectController::class, 'destroy']);
});
