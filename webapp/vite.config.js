import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/css/admin.css',
                'resources/js/app.js',
                'resources/js/auth-check.js',
                'resources/js/dashboard.js',
                'resources/js/file-upload.js',
                'resources/js/subject-profile-modal.js',
                'resources/js/admin.js',
                'resources/js/modules/auth.js',
                'resources/js/modules/toast.js'
            ],
            refresh: true,
        }),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
        },
    },
});
