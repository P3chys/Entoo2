@extends('layouts.app')

@section('title', 'Register - Entoo')

@section('content')
<div class="auth-container">
    <div class="auth-card">
        <div style="text-align: center; margin-bottom: var(--spacing-xl);">
            <div style="width: 64px; height: 64px; background: var(--primary-gradient); border-radius: var(--radius-xl); display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto var(--spacing-lg); box-shadow: var(--shadow-lg);">
                ✨
            </div>
            <h2>Create Account</h2>
            <p class="subtitle">Join Entoo to manage your documents</p>
        </div>

        <div id="errorMessage" class="alert alert-error hidden"></div>
        <div id="successMessage" class="alert alert-success hidden"></div>

        <form id="registerForm" onsubmit="handleRegister(event)">
            <div class="form-group">
                <label for="name">Full Name</label>
                <input type="text" id="name" name="name" required placeholder="John Doe">
            </div>

            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required placeholder="your@email.com">
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required
                       placeholder="At least 8 characters" minlength="8">
            </div>

            <div class="form-group">
                <label for="password_confirmation">Confirm Password</label>
                <input type="password" id="password_confirmation" name="password_confirmation"
                       required placeholder="Repeat your password" minlength="8">
            </div>

            <button type="submit" class="btn btn-primary btn-block" id="registerBtn">
                Register
            </button>
        </form>

        <div class="auth-footer">
            <p>Already have an account? <a href="/login">Login here</a></p>
        </div>
    </div>
</div>

<script>
async function handleRegister(event) {
    event.preventDefault();

    const btn = document.getElementById('registerBtn');
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');

    btn.disabled = true;
    btn.textContent = 'Creating account...';
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        password_confirmation: document.getElementById('password_confirmation').value
    };

    // Validate password match
    if (formData.password !== formData.password_confirmation) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Register';
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            successDiv.textContent = 'Account created successfully! Redirecting to dashboard...';
            successDiv.classList.remove('hidden');

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } else {
            const errors = data.errors || {};
            const errorMessages = Object.values(errors).flat();
            errorDiv.textContent = errorMessages.join(', ') || data.message || 'Registration failed';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again.';
        errorDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Register';
    }
}
</script>
@endsection
