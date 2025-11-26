import { fetchAPI } from './api.js';
import { state } from './state.js';

/**
 * Load favorites
 */
export async function loadFavorites() {
    try {
        const response = await fetchAPI('/api/favorites');
        state.favorites = response.favorites || [];
        updateFavoriteCount();
    } catch (error) {
        state.favorites = [];
    }
}

/**
 * Update favorite count badge
 */
export function updateFavoriteCount() {
    const elem = document.getElementById('favoriteCount');
    if (elem) {
        elem.textContent = state.favorites.length;
    }
}

/**
 * Check if subject is favorite
 */
export function isFavorite(subjectName) {
    return state.favorites.some(f => f.subject_name === subjectName);
}

/**
 * Toggle favorite status
 * @param {string} subjectName 
 * @param {Event} event 
 * @param {Function} onUpdateCallback Callback to run after successful update (e.g. update UI)
 */
export async function toggleFavorite(subjectName, event, onUpdateCallback) {
    event.stopPropagation();

    const favorite = state.favorites.find(f => f.subject_name === subjectName);
    const isRemoving = !!favorite;

    try {
        if (isRemoving) {
            await fetchAPI(`/api/favorites/${favorite.id}`, { method: 'DELETE' });
            state.favorites = state.favorites.filter(f => f.id !== favorite.id);
        } else {
            const response = await fetchAPI('/api/favorites', {
                method: 'POST',
                body: JSON.stringify({ subject_name: subjectName })
            });
            state.favorites.push(response.favorite);
        }

        updateFavoriteCount();

        if (onUpdateCallback) {
            onUpdateCallback(subjectName);
        }

    } catch (error) {
        alert('Failed to update favorite');
    }
}
