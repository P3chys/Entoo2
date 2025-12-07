<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Entoo')</title>
    @vite(['resources/css/app.css'])
    <script>
        // Initialize theme immediately to prevent flash
        (function() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = savedTheme === 'system' ? (prefersDark ? 'dark' : 'light') : savedTheme;
            document.documentElement.setAttribute('data-theme', theme);
        })();
    </script>
    <style>
        .auth-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-secondary);
            padding: var(--spacing-lg);
        }

        .auth-wrapper {
            width: 100%;
            max-width: 420px;
        }

        .auth-brand {
            text-align: center;
            margin-bottom: var(--spacing-xl);
        }

        .auth-brand-icon {
            width: 64px;
            height: 64px;
            background: var(--accent-primary);
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            margin: 0 auto var(--spacing-md);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .auth-brand h1 {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0;
        }

        .auth-card {
            background: var(--bg-primary);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-lg);
            padding: var(--spacing-2xl);
            border: 1px solid var(--border-secondary);
        }

        .auth-header {
            text-align: center;
            margin-bottom: var(--spacing-xl);
        }

        .auth-header h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0 0 var(--spacing-xs);
        }

        .auth-header .subtitle {
            color: var(--text-secondary);
            margin: 0;
        }

        .auth-form .form-group {
            margin-bottom: var(--spacing-lg);
        }

        .auth-form label {
            display: block;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: var(--spacing-xs);
        }

        .auth-form input {
            width: 100%;
            padding: var(--spacing-md);
            border: 1px solid var(--border-primary);
            border-radius: var(--radius-md);
            background: var(--bg-secondary);
            color: var(--text-primary);
            font-size: 1rem;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .auth-form input:focus {
            outline: none;
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .auth-form input::placeholder {
            color: var(--text-tertiary);
        }

        .auth-form small {
            display: block;
            margin-top: var(--spacing-xs);
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        .auth-form small a {
            color: var(--accent-primary);
            text-decoration: none;
        }

        .auth-form small a:hover {
            text-decoration: underline;
        }

        .auth-form .btn-primary {
            width: 100%;
            padding: var(--spacing-md) var(--spacing-lg);
            font-size: 1rem;
            font-weight: 600;
        }

        .auth-footer {
            text-align: center;
            margin-top: var(--spacing-xl);
            padding-top: var(--spacing-lg);
            border-top: 1px solid var(--border-secondary);
        }

        .auth-footer p {
            color: var(--text-secondary);
            margin: 0;
        }

        .auth-footer a {
            color: var(--accent-primary);
            font-weight: 500;
            text-decoration: none;
        }

        .auth-footer a:hover {
            text-decoration: underline;
        }

        .alert {
            padding: var(--spacing-md);
            border-radius: var(--radius-md);
            margin-bottom: var(--spacing-lg);
            font-size: 0.875rem;
        }

        .alert-error {
            background: rgba(239, 68, 68, 0.1);
            color: var(--error);
            border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .alert-success {
            background: rgba(34, 197, 94, 0.1);
            color: var(--success);
            border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .hidden {
            display: none !important;
        }

        /* Modal styles for forgot password */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: var(--spacing-lg);
        }

        .modal-content {
            background: var(--bg-primary);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-xl);
            width: 100%;
            max-width: 420px;
            border: 1px solid var(--border-secondary);
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--spacing-lg) var(--spacing-xl);
            border-bottom: 1px solid var(--border-secondary);
        }

        .modal-header h2 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }

        .close-btn:hover {
            color: var(--text-primary);
        }

        .modal-body {
            padding: var(--spacing-xl);
        }
    </style>
</head>
<body>
    <div class="auth-page">
        <div class="auth-wrapper">
            <div class="auth-brand">
                <div class="auth-brand-icon">
                    <span>📚</span>
                </div>
                <h1>Entoo</h1>
            </div>

            @yield('content')
        </div>
    </div>

    @stack('scripts')
</body>
</html>
