@extends('layouts.app')

@section('title', 'Forgot Password - Entoo')

@section('content')
<div class="auth-container">
    <div class="auth-card">
        <div style="text-align: center; margin-bottom: var(--spacing-xl);">
            <div style="width: 64px; height: 64px; background: var(--primary-gradient); border-radius: var(--radius-xl); display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto var(--spacing-lg); box-shadow: var(--shadow-lg);">
                🔑
            </div>
            <h2>Forgot Password</h2>
            <p class="subtitle">Enter your email to receive reset instructions</p>
        </div>

        <div id="message" class="alert hidden"></div>

        <form id="forgotPasswordForm" onsubmit="handleForgotPassword(event)">
            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" name="email" required placeholder="your@email.com" autocomplete="email">
                <small>We'll send you instructions to reset your password.</small>
            </div>

            <button type="submit" class="btn btn-primary btn-block" id="submitBtn">
                Send Reset Link
            </button>
        </form>

        <div class="auth-footer">
            <p><a href="/login">Back to Login</a></p>
        </div>
    </div>
</div>

<script>
async function handleForgotPassword(event) {
    event.preventDefault();

    const btn = document.getElementById('submitBtn');
    const messageDiv = document.getElementById('message');
    const email = document.getElementById('email').value;

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
            messageDiv.textContent = data.message || 'Password reset instructions have been sent to your email.';
            messageDiv.classList.remove('hidden');
            document.getElementById('forgotPasswordForm').reset();
        } else {
            messageDiv.className = 'alert alert-error';
            messageDiv.textContent = data.message || 'Failed to send reset link. Please try again.';
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
