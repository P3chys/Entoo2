/**
 * Theme Management Module
 * Handles light/dark mode switching with system preference detection
 */

const THEME_KEY = 'entoo-theme';
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';

/**
 * Initialize theme on page load
 */
export function initTheme() {
    const savedTheme = getSavedTheme();
    const systemTheme = getSystemTheme();
    const theme = savedTheme || systemTheme;

    applyTheme(theme);
    setupThemeToggle();
    watchSystemTheme();
}

/**
 * Get saved theme from localStorage
 */
function getSavedTheme() {
    return localStorage.getItem(THEME_KEY);
}

/**
 * Get system/OS theme preference
 */
function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return THEME_DARK;
    }
    return THEME_LIGHT;
}

/**
 * Get current theme
 */
export function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || THEME_LIGHT;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);

    // Update meta theme-color for mobile browsers
    updateMetaThemeColor(theme);

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
}

/**
 * Toggle between light and dark theme
 */
export function toggleTheme() {
    const currentTheme = getCurrentTheme();
    const newTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    applyTheme(newTheme);
    return newTheme;
}

/**
 * Setup theme toggle button listeners
 */
function setupThemeToggle() {
    const toggleButtons = document.querySelectorAll('.theme-toggle');

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const newTheme = toggleTheme();
            console.log(`Theme switched to: ${newTheme}`);
        });
    });
}

/**
 * Watch for system theme changes
 */
function watchSystemTheme() {
    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

        darkModeQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a preference
            if (!getSavedTheme()) {
                const newTheme = e.matches ? THEME_DARK : THEME_LIGHT;
                applyTheme(newTheme);
            }
        });
    }
}

/**
 * Update meta theme-color for mobile browsers
 */
function updateMetaThemeColor(theme) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
    }

    // Set color based on theme
    const color = theme === THEME_DARK ? '#1e293b' : '#ffffff';
    metaThemeColor.content = color;
}

/**
 * Create theme toggle button HTML
 */
export function createThemeToggleButton() {
    return `
        <button class="theme-toggle" aria-label="Toggle theme" title="Toggle theme">
            <svg class="theme-toggle-icon icon-sun" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <svg class="theme-toggle-icon icon-moon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
        </button>
    `;
}

export default {
    initTheme,
    getCurrentTheme,
    applyTheme,
    toggleTheme,
    createThemeToggleButton
};
