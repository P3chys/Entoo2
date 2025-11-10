<!-- Search Bar -->
<div class="search-section glass-search">
    <form action="/dashboard/search" method="GET" class="search-bar">
        <input type="text" name="q" id="searchInput" class="glass-input" placeholder="Search in file names and content (fuzzy matching supported)..."
                value="{{ $searchQuery ?? '' }}">
        <button type="submit" class="btn btn-secondary">🔍 Search</button>
        <a href="/dashboard" class="btn btn-secondary" id="clearSearchBtn" style="display:{{ isset($searchQuery) && $searchQuery ? 'inline-flex' : 'none' }}">✕ Clear</a>
    </form>
    <div class="search-options">
        <label class="checkbox-label">
            <input type="checkbox" id="searchInContent" checked>
            Search in file content
        </label>
        <label class="checkbox-label">
            <input type="checkbox" id="searchInFilename" checked>
            Search in file names
        </label>
    </div>
</div>