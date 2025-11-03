@extends('layouts.app')

@section('title', 'Dashboard - Entoo')

@section('content')
<div class="dashboard-container">
    <div class="container">
        <x-search :searchQuery="$searchQuery ?? null" />

        <!-- Global Upload Button -->
        <div style="margin-bottom: var(--spacing-lg); display: flex; justify-content: flex-end;">
            <button class="btn btn-primary upload-button" id="uploadFileBtn" onclick="openUploadModalGlobal()">
                📤 Upload File
            </button>
        </div>

        <!-- Dashboard Stats -->
        <div class="stats-grid" style="margin-bottom: var(--spacing-xl);">
            <div class="stat-card">
                <h3 id="favoriteCount" class="favorite-count">0</h3>
                <p>Favorite Subjects</p>
            </div>
            <div class="stat-card">
                <h3 id="totalSubjects">0</h3>
                <p>Total Subjects</p>
            </div>
            <div class="stat-card">
                <h3 id="totalFiles">0</h3>
                <p>Total Files</p>
            </div>
            <div class="stat-card">
                <h3 id="totalStorage">0 MB</h3>
                <p>Storage Used</p>
            </div>
        </div>

        <x-file-tree />
        <x-file-upload />
        <x-subject-profile-modal />
    </div>
</div>
@endsection

@push('scripts')
    {{-- Pass route parameters to JavaScript --}}
    <script>
        // Set route parameters for dashboard.js
        window.dashboardRouteParams = {
            selectedSubject: @json($selectedSubject ?? null),
            searchQuery: @json($searchQuery ?? null),
            profileSubject: @json($profileSubject ?? null),
            filterUserId: @json($filterUserId ?? null),
            filterUserName: @json($filterUserName ?? null)
        };
    </script>

    {{-- Load dashboard main JavaScript --}}
    @vite('resources/js/dashboard.js')
@endpush
