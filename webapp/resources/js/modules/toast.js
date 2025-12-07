/**
 * Toast Notification System
 *
 * Provides elegant, non-intrusive notifications for user feedback.
 * Supports success, error, warning, and info messages.
 */

export const toast = {
    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms (0 = permanent until dismissed)
     */
    show(message, type = 'info', duration = 4000) {
        const container = this.getOrCreateContainer();
        const toastEl = this.createToast(message, type);

        container.appendChild(toastEl);

        // Trigger animation
        setTimeout(() => toastEl.classList.add('show'), 10);

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(toastEl), duration);
        }

        return toastEl;
    },

    /**
     * Show success toast
     */
    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    },

    /**
     * Show error toast
     */
    error(message, duration = 6000) {
        return this.show(message, 'error', duration);
    },

    /**
     * Show warning toast
     */
    warning(message, duration = 5000) {
        return this.show(message, 'warning', duration);
    },

    /**
     * Show info toast
     */
    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    },

    /**
     * Get or create toast container
     */
    getOrCreateContainer() {
        let container = document.getElementById('toastContainer');

        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        return container;
    },

    /**
     * Create toast element
     */
    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const colors = {
            success: { bg: '#10b981', icon: '✓' },
            error: { bg: '#ef4444', icon: '✕' },
            warning: { bg: '#f59e0b', icon: '⚠' },
            info: { bg: '#3b82f6', icon: 'ℹ' }
        };

        const config = colors[type] || colors.info;

        toast.style.cssText = `
            background: ${config.bg};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 300px;
            max-width: 500px;
            pointer-events: auto;
            opacity: 0;
            transform: translateX(100px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        toast.innerHTML = `
            <div style="
                width: 24px;
                height: 24px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 14px;
            ">${config.icon}</div>
            <div style="flex: 1; font-weight: 500; line-height: 1.4;">
                ${this.escapeHtml(message)}
            </div>
            <button onclick="this.parentElement.remove()" style="
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'"
               onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
        `;

        return toast;
    },

    /**
     * Dismiss a toast
     */
    dismiss(toastEl) {
        toastEl.style.opacity = '0';
        toastEl.style.transform = 'translateX(100px)';

        setTimeout(() => {
            toastEl.remove();

            // Clean up container if empty
            const container = document.getElementById('toastContainer');
            if (container && container.children.length === 0) {
                container.remove();
            }
        }, 300);
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Make toast available globally
window.toast = toast;

// Add show animation class style
const style = document.createElement('style');
style.textContent = `
    .toast.show {
        opacity: 1 !important;
        transform: translateX(0) !important;
    }
`;
document.head.appendChild(style);
