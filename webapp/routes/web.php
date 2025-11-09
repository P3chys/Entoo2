<?php

use Illuminate\Support\Facades\Route;

// Redirect root to login
Route::get('/', function () {
    return redirect('/login');
});

// Authentication pages
Route::get('/login', function () {
    return view('auth.login');
})->name('login');

Route::get('/register', function () {
    return view('auth.register');
})->name('register');

// Password reset pages
Route::get('/forgot-password', function () {
    return view('auth.forgot-password');
})->name('password.request');

Route::get('/reset-password/{token}', function ($token) {
    return view('auth.reset-password', ['token' => $token]);
})->name('password.reset');

// Dashboard and app pages
Route::get('/dashboard', function () {
    return view('dashboard-enhanced');
})->name('dashboard');

// Dashboard sub-routes with proper navigation
Route::get('/dashboard/subject/{subject}', function ($subject) {
    return view('dashboard-enhanced', ['selectedSubject' => urldecode($subject)]);
})->name('dashboard.subject');

Route::get('/dashboard/search', function () {
    $query = request('q', '');
    return view('dashboard-enhanced', ['searchQuery' => $query]);
})->name('dashboard.search');

Route::get('/dashboard/profile/{subject}', function ($subject) {
    return view('dashboard-enhanced', ['profileSubject' => urldecode($subject)]);
})->name('dashboard.profile');

Route::get('/dashboard/user/{userId}/{userName?}', function ($userId, $userName = null) {
    return view('dashboard-enhanced', ['filterUserId' => $userId, 'filterUserName' => $userName]);
})->name('dashboard.user');

Route::get('/favorites', function () {
    return view('favorites');
})->name('favorites');
