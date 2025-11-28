import purgecssPlugin from '@fullhuman/postcss-purgecss';
import cssnano from 'cssnano';

const purgecss = purgecssPlugin.default || purgecssPlugin;

export default {
    plugins: [
        // PurgeCSS - Remove unused CSS
        purgecss({
            content: [
                './resources/views/**/*.blade.php',
                './resources/js/**/*.js',
                './app/View/Components/**/*.php',
            ],
            // Safelist important classes that might be added dynamically
            safelist: {
                standard: [
                    /^glass-/,
                    /^btn-/,
                    /^badge-/,
                    /^notification-/,
                    /^modal-/,
                    /^data-theme/,
                    'show',
                    'active',
                    'hidden',
                    'favorite',
                ],
                deep: [
                    /^glass-/,
                    /^fi-/,  // Filament icons
                ],
                greedy: [
                    /^data-/,
                ],
            },
            // Don't purge from these files
            rejected: false,
            defaultExtractor: (content) => {
                // Extract all class names
                const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
                const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
                return broadMatches.concat(innerMatches);
            },
        }),

        // Cssnano - Minify CSS (only in production)
        process.env.NODE_ENV === 'production' && cssnano({
            preset: ['default', {
                discardComments: {
                    removeAll: true,
                },
                // Don't remove all unused rules, PurgeCSS handles that
                discardUnused: false,
            }],
        }),
    ].filter(Boolean),
};
