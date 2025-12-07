<?php

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;

// Redirect root to login
Route::get('/', function () {
    return redirect('/login');
});

// Authentication pages
Route::get('/login', function () {
    return view('auth.login');
})->name('login');

// Web login POST - creates session for protected routes
Route::post('/login', function (Request $request) {
    $credentials = $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);

    $user = User::where('email', $credentials['email'])->first();

    if (!$user || !Hash::check($credentials['password'], $user->password)) {
        return response()->json([
            'success' => false,
            'message' => 'The provided credentials are incorrect.',
        ], 422);
    }

    // Create session-based auth (this persists in web middleware)
    Auth::login($user);

    // Also create API token for JavaScript use
    $user->tokens()->delete(); // Revoke old tokens
    $token = $user->createToken('auth_token')->plainTextToken;

    $redirect = $request->input('redirect', '/dashboard');

    return response()->json([
        'success' => true,
        'message' => 'Login successful',
        'user' => $user,
        'token' => $token,
        'redirect' => $redirect,
    ]);
})->name('login.post');

// Web logout - clears session
Route::post('/logout', function (Request $request) {
    // Clear API tokens
    if (Auth::check()) {
        Auth::user()->tokens()->delete();
    }

    Auth::logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();

    return redirect('/login');
})->name('logout');

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

// Protected dashboard and app pages - require authentication
Route::middleware(['auth.web'])->group(function () {
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

    // Admin dashboard
    // Security: admin.js checks user.is_admin on page load and redirects non-admins
    // All admin API endpoints are protected with auth:sanctum + admin middleware
    Route::get('/admin', function () {
        return view('admin.dashboard');
    })->name('admin.dashboard');
});
