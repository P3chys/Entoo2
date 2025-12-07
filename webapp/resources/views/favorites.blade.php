@extends('layouts.app')

@section('title', 'Favorites - Entoo')

@push('scripts')
    {{-- Auth check - validates token before loading page --}}
    @vite('resources/js/auth-check.js')
@endpush

@section('content')
<div class="dashboard-container">
    <div class="container">
        <!-- Header -->
        <div class="dashboard-header">
            <h1>Favorite Subjects</h1>
            <button onclick="toggleAddModal()" class="btn btn-primary">
                + Add Favorite
            </button>
        </div>

        <!-- Stats -->
        <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); max-width: 600px;">
            <div class="stat-card">
                <h3 id="totalFavorites">0</h3>
                <p>Favorite Subjects</p>
            </div>
            <div class="stat-card">
                <h3 id="totalFiles">0</h3>
                <p>Total Files</p>
            </div>
        </div>

        <!-- Favorites List -->
        <div class="files-section">
            <div id="loadingFavorites" class="loading hidden">Loading favorites...</div>
            <div id="noFavorites" class="empty-state hidden">
                <p>No favorite subjects yet. Add your first favorite to get started!</p>
            </div>
            <div id="favoritesGrid" class="files-grid"></div>
        </div>
    </div>
</div>

<!-- Add Favorite Modal -->
<div id="addModal" class="modal hidden">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Add Favorite Subject</h2>
            <button onclick="toggleAddModal()" class="close-btn">&times;</button>
        </div>

        <div id="addError" class="alert alert-error hidden"></div>
        <div id="addSuccess" class="alert alert-success hidden"></div>

        <form id="addForm" onsubmit="handleAddFavorite(event)">
            <div class="form-group">
                <label for="subjectName">Subject Name</label>
                <input type="text" id="subjectName" name="subject_name" required
                       placeholder="e.g., Database Systems">
                <small>Enter the name of the subject you want to add to favorites</small>
            </div>

            <div class="modal-footer">
                <button type="button" onclick="toggleAddModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary" id="addBtn">Add Favorite</button>
            </div>
        </form>
    </div>
</div>

<script>
// Global state
let favorites = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadFavorites();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Display user info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.textContent = user.name || user.email;
    }
}

async function loadFavorites() {
    const loading = document.getElementById('loadingFavorites');
    const noFavorites = document.getElementById('noFavorites');
    const favoritesGrid = document.getElementById('favoritesGrid');

    loading.classList.remove('hidden');

    try {
        const response = await fetchAPI('/api/favorites');
        favorites = response.favorites || [];

        loading.classList.add('hidden');

        if (favorites.length === 0) {
            noFavorites.classList.remove('hidden');
            favoritesGrid.innerHTML = '';
        } else {
            noFavorites.classList.add('hidden');
            displayFavorites(favorites);
        }

        // Update stats
        document.getElementById('totalFavorites').textContent = favorites.length;
        await loadStats();
    } catch (error) {
        loading.classList.add('hidden');
        favoritesGrid.innerHTML = '<p class="error">Failed to load favorites</p>';
    }
}

async function loadStats() {
    try {
        const response = await fetchAPI('/api/stats');
        document.getElementById('totalFiles').textContent = response.total_files || 0;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

function displayFavorites(favorites) {
    const favoritesGrid = document.getElementById('favoritesGrid');
    favoritesGrid.innerHTML = '';

    favorites.forEach(favorite => {
        const favoriteCard = createFavoriteCard(favorite);
        favoritesGrid.appendChild(favoriteCard);
    });
}

function createFavoriteCard(favorite) {
    const card = document.createElement('div');
    card.className = 'file-card';

    const date = new Date(favorite.created_at).toLocaleDateString();

    card.innerHTML = `
        <div class="file-icon">⭐</div>
        <div class="file-info">
            <h3 class="file-name" title="${favorite.subject_name}">${favorite.subject_name}</h3>
            <p class="file-details">
                <span>Added: ${date}</span>
            </p>
        </div>
        <div class="file-actions">
            <button onclick="viewSubject('${favorite.subject_name}')" class="btn-icon" title="View Files">
                👁️
            </button>
            <button onclick="removeFavorite(${favorite.id})" class="btn-icon" title="Remove">
                🗑️
            </button>
        </div>
    `;

    return card;
}

function toggleAddModal() {
    const modal = document.getElementById('addModal');
    modal.classList.toggle('hidden');

    if (!modal.classList.contains('hidden')) {
        document.getElementById('addForm').reset();
        document.getElementById('addError').classList.add('hidden');
        document.getElementById('addSuccess').classList.add('hidden');
    }
}

async function handleAddFavorite(event) {
    event.preventDefault();

    const btn = document.getElementById('addBtn');
    const errorDiv = document.getElementById('addError');
    const successDiv = document.getElementById('addSuccess');

    btn.disabled = true;
    btn.textContent = 'Adding...';
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    const subjectName = document.getElementById('subjectName').value;

    try {
        await fetchAPI('/api/favorites', {
            method: 'POST',
            body: JSON.stringify({ subject_name: subjectName })
        });

        successDiv.textContent = 'Favorite added successfully!';
        successDiv.classList.remove('hidden');

        setTimeout(() => {
            toggleAddModal();
            loadFavorites();
        }, 1000);
    } catch (error) {
        errorDiv.textContent = error.message || 'Failed to add favorite';
        errorDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Favorite';
    }
}

async function removeFavorite(favoriteId) {
    if (!confirm('Are you sure you want to remove this favorite?')) {
        return;
    }

    try {
        await fetchAPI(`/api/favorites/${favoriteId}`, { method: 'DELETE' });
        loadFavorites();
    } catch (error) {
        alert('Failed to remove favorite');
    }
}

function viewSubject(subjectName) {
    // Redirect to dashboard with subject filter
    window.location.href = `/dashboard?subject=${encodeURIComponent(subjectName)}`;
}

async function fetchAPI(url, options = {}) {
    const token = localStorage.getItem('token');

    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    return await response.json();
}
</script>
@endsection
