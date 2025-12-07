@extends('layouts.auth')

@section('title', 'Login - Entoo')

@section('content')
<div class="auth-card">
    <div class="auth-header">
        <h2>Welcome Back</h2>
        <p class="subtitle">Login to access your documents</p>
    </div>

    <div id="errorMessage" class="alert alert-error hidden"></div>

    <form id="loginForm" class="auth-form" onsubmit="handleLogin(event)">
        <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required placeholder="your@email.com" autocomplete="email">
        </div>

        <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required placeholder="Enter your password" autocomplete="current-password">
            <small><a href="/forgot-password">Forgot password?</a></small>
        </div>

        <button type="submit" class="btn btn-primary" id="loginBtn">
            Login
        </button>
    </form>

    <div class="auth-footer">
        <p>Don't have an account? <a href="/register">Register here</a></p>
    </div>
</div>

<script>
async function handleLogin(event) {
    event.preventDefault();

    const btn = document.getElementById('loginBtn');
    const errorDiv = document.getElementById('errorMessage');

    btn.disabled = true;
    btn.textContent = 'Logging in...';
    errorDiv.classList.add('hidden');

    // Get redirect URL from query params
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect') || '/dashboard';

    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        redirect: redirectUrl
    };

    try {
        // Use web route (not API) to create session
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Store token for API calls
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect - session is now established server-side
            window.location.href = data.redirect || '/dashboard';
        } else {
            errorDiv.textContent = data.message || 'Login failed. Please check your credentials.';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again.';
        errorDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Login';
    }
}
</script>
@endsection
