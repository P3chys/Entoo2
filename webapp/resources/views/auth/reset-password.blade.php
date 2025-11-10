@extends('layouts.app')

@section('title', 'Reset Password - Entoo')

@section('content')
<div class="auth-container">
    <div class="auth-card">
        <div style="text-align: center; margin-bottom: var(--spacing-xl);">
            <div style="width: 64px; height: 64px; background: var(--primary-gradient); border-radius: var(--radius-xl); display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto var(--spacing-lg); box-shadow: var(--shadow-lg);">
                🔐
            </div>
            <h2>Reset Password</h2>
            <p class="subtitle">Enter your new password below</p>
        </div>

        <div id="message" class="alert hidden"></div>

        <form id="resetPasswordForm" onsubmit="handleResetPassword(event)">
            <input type="hidden" id="token" value="{{ $token }}">

            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" name="email" required placeholder="your@email.com" autocomplete="email">
            </div>

            <div class="form-group">
                <label for="password">New Password</label>
                <input type="password" id="password" name="password" required placeholder="Enter new password" minlength="8" autocomplete="new-password">
                <small>Minimum 8 characters</small>
            </div>

            <div class="form-group">
                <label for="password_confirmation">Confirm Password</label>
                <input type="password" id="password_confirmation" name="password_confirmation" required placeholder="Confirm new password" minlength="8" autocomplete="new-password">
            </div>

            <button type="submit" class="btn btn-primary btn-block" id="submitBtn">
                Reset Password
            </button>
        </form>

        <div class="auth-footer">
            <p><a href="/login">Back to Login</a></p>
        </div>
    </div>
</div>

<script>
async function handleResetPassword(event) {
    event.preventDefault();

    const btn = document.getElementById('submitBtn');
    const messageDiv = document.getElementById('message');

    const formData = {
        token: document.getElementById('token').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        password_confirmation: document.getElementById('password_confirmation').value
    };

    // Client-side validation
    if (formData.password !== formData.password_confirmation) {
        messageDiv.className = 'alert alert-error';
        messageDiv.textContent = 'Passwords do not match.';
        messageDiv.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Resetting...';
    messageDiv.classList.add('hidden');

    try {
        const response = await fetch('/api/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            messageDiv.className = 'alert alert-success';
            messageDiv.textContent = data.message || 'Password reset successfully! Redirecting to login...';
            messageDiv.classList.remove('hidden');

            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } else {
            messageDiv.className = 'alert alert-error';
            messageDiv.textContent = data.message || 'Failed to reset password. Please try again.';
            messageDiv.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Reset Password';
        }
    } catch (error) {
        messageDiv.className = 'alert alert-error';
        messageDiv.textContent = 'An error occurred. Please try again.';
        messageDiv.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Reset Password';
    }
}
</script>
@endsection
