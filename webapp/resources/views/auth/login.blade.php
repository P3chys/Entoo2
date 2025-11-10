@extends('layouts.app')

@section('title', 'Login - Entoo')

@section('content')
<div class="auth-container">
    <div class="auth-card glass-auth-card">
        <div style="text-align: center; margin-bottom: var(--spacing-2xl);">
            <div style="width: 64px; height: 64px; background: var(--primary-600); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto var(--spacing-lg); color: white;">
                📚
            </div>
            <h2>Welcome Back</h2>
            <p class="subtitle">Login to access your documents</p>
        </div>

        <div id="errorMessage" class="alert alert-error hidden"></div>

        <form id="loginForm" onsubmit="handleLogin(event)">
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required placeholder="your@email.com">
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required placeholder="Enter your password">
                <small><a href="#" onclick="showForgotPassword(event)">Forgot password?</a></small>
            </div>

            <button type="submit" class="btn btn-primary btn-block" id="loginBtn">
                Login
            </button>
        </form>

        <div class="auth-footer">
            <p>Don't have an account? <a href="/register">Register here</a></p>
        </div>
    </div>
</div>

<!-- Forgot Password Modal -->
<div id="forgotPasswordModal" class="modal glass-modal-backdrop hidden">
    <div class="modal-content glass-modal-content">
        <div class="modal-header">
            <h2>Reset Password</h2>
            <button onclick="closeForgotPassword()" class="close-btn">&times;</button>
        </div>

        <div style="padding: var(--spacing-xl);">
            <div id="forgotMessage" class="alert hidden"></div>

            <form id="forgotPasswordForm" onsubmit="handleForgotPassword(event)">
                <div class="form-group">
                    <label for="forgotEmail">Email Address</label>
                    <input type="email" id="forgotEmail" required placeholder="your@email.com">
                    <small>We'll send you instructions to reset your password.</small>
                </div>

                <button type="submit" class="btn btn-primary" id="forgotBtn">
                    Send Reset Link
                </button>
            </form>
        </div>
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

    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/dashboard';
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

function showForgotPassword(event) {
    event.preventDefault();
    document.getElementById('forgotPasswordModal').classList.remove('hidden');
}

function closeForgotPassword() {
    document.getElementById('forgotPasswordModal').classList.add('hidden');
    document.getElementById('forgotMessage').classList.add('hidden');
}

async function handleForgotPassword(event) {
    event.preventDefault();

    const btn = document.getElementById('forgotBtn');
    const messageDiv = document.getElementById('forgotMessage');
    const email = document.getElementById('forgotEmail').value;

    btn.disabled = true;
    btn.textContent = 'Sending...';
    messageDiv.classList.add('hidden');

    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            messageDiv.className = 'alert alert-success';
            messageDiv.textContent = data.message || 'Password reset instructions sent to your email.';
            messageDiv.classList.remove('hidden');
            document.getElementById('forgotPasswordForm').reset();
            setTimeout(closeForgotPassword, 3000);
        } else {
            messageDiv.className = 'alert alert-error';
            messageDiv.textContent = data.message || 'Failed to send reset link.';
            messageDiv.classList.remove('hidden');
        }
    } catch (error) {
        messageDiv.className = 'alert alert-error';
        messageDiv.textContent = 'An error occurred. Please try again.';
        messageDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Reset Link';
    }
}
</script>
@endsection
