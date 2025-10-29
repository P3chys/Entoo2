<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\SubjectController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

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
    Route::put('/subject-profiles/{id}', [\App\Http\Controllers\Api\SubjectProfileController::class, 'update']);
    Route::delete('/subject-profiles/{id}', [\App\Http\Controllers\Api\SubjectProfileController::class, 'destroy']);
});
