/**
 * Tabbed Navigation Module
 * Handles tab switching and content display
 */

import { DOCUMENT_TYPES } from './documentTypes.js';

let currentTab = 'notes';
let tabChangeCallback = null;

/**
 * Initialize tab navigation
 */
export function initTabs(onTabChange) {
    tabChangeCallback = onTabChange;

    const tabs = document.querySelectorAll('.tab[role="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => handleTabClick(tab));
    });

    // Handle keyboard navigation
    document.getElementById('contentTabs')?.addEventListener('keydown', handleKeyboardNav);

    // Initialize first tab as active
    switchToTab('notes');
}

/**
 * Handle tab click
 */
function handleTabClick(tabElement) {
    const tabId = tabElement.dataset.tab;
    const category = tabElement.dataset.type;

    switchToTab(tabId);

    // Call callback if provided
    if (tabChangeCallback) {
        tabChangeCallback(tabId, category);
    }
}

/**
 * Switch to a specific tab
 */
export function switchToTab(tabId) {
    currentTab = tabId;

    // Update tab buttons
    const tabs = document.querySelectorAll('.tab[role="tab"]');
    tabs.forEach(tab => {
        const isActive = tab.dataset.tab === tabId;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive.toString());
    });

    // Update tab panels
    const panels = document.querySelectorAll('.tab-panel[role="tabpanel"]');
    panels.forEach(panel => {
        const isActive = panel.id === `${tabId}-panel`;
        panel.classList.toggle('active', isActive);
    });

    // Update URL hash (optional)
    updateURLHash(tabId);
}

/**
 * Get current active tab
 */
export function getCurrentTab() {
    return currentTab;
}

/**
 * Update tab badge count
 */
export function updateTabBadge(tabId, count) {
    const badge = document.querySelector(`.tab[data-tab="${tabId}"] .tab-badge`);
    if (badge) {
        badge.textContent = count;
        badge.setAttribute('data-count', count);
    }

    const panelCount = document.querySelector(`#${tabId}-panel .tab-panel-count`);
    if (panelCount) {
        panelCount.textContent = count;
        panelCount.setAttribute('data-count', count);
    }
}

/**
 * Update all tab badges
 */
export function updateAllTabBadges(counts) {
    Object.entries(counts).forEach(([tabId, count]) => {
        updateTabBadge(tabId, count);
    });
}

/**
 * Handle keyboard navigation (Arrow keys, Home, End)
 */
function handleKeyboardNav(event) {
    const tabs = Array.from(document.querySelectorAll('.tab[role="tab"]'));
    const currentIndex = tabs.findIndex(tab => tab.classList.contains('active'));

    let newIndex = currentIndex;

    switch (event.key) {
        case 'ArrowRight':
            newIndex = (currentIndex + 1) % tabs.length;
            break;
        case 'ArrowLeft':
            newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            break;
        case 'Home':
            newIndex = 0;
            break;
        case 'End':
            newIndex = tabs.length - 1;
            break;
        default:
            return; // Don't prevent default for other keys
    }

    if (newIndex !== currentIndex) {
        event.preventDefault();
        tabs[newIndex].focus();
        tabs[newIndex].click();
    }
}

/**
 * Update URL hash based on active tab
 */
function updateURLHash(tabId) {
    if (window.history && window.history.replaceState) {
        const newUrl = `${window.location.pathname}${window.location.search}#${tabId}`;
        window.history.replaceState(null, '', newUrl);
    }
}

/**
 * Get tab from URL hash
 */
export function getTabFromURL() {
    const hash = window.location.hash.substring(1);
    const validTabs = ['notes', 'case-briefs', 'statutes', 'past-papers', 'discussion'];

    return validTabs.includes(hash) ? hash : 'notes';
}

/**
 * Initialize tab from URL on page load
 */
export function initTabFromURL() {
    const tabFromURL = getTabFromURL();
    if (tabFromURL) {
        switchToTab(tabFromURL);
    }
}

/**
 * Handle sort change in tab panel
 */
export function initSortHandlers(onSortChange) {
    const sortSelects = document.querySelectorAll('.tab-sort-select');

    sortSelects.forEach(select => {
        select.addEventListener('change', (e) => {
            const tabId = select.dataset.sort;
            const sortValue = select.value;

            if (onSortChange) {
                onSortChange(tabId, sortValue);
            }
        });
    });
}

export default {
    initTabs,
    switchToTab,
    getCurrentTab,
    updateTabBadge,
    updateAllTabBadges,
    getTabFromURL,
    initTabFromURL,
    initSortHandlers
};
