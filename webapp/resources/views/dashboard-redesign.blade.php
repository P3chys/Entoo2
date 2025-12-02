@extends('layouts.app')

@section('title', 'Dashboard - Entoo')

@section('content')
<div class="dashboard-redesign">
    {{-- Sidebar with Semester Groups --}}
    <x-sidebar-redesign />

    {{-- Main Content Area --}}
    <main class="dashboard-main-content" style="margin-left: var(--sidebar-width); padding: var(--spacing-2xl);">
        {{-- Subject Header --}}
        <x-subject-header-redesign />

        {{-- Content Tabs --}}
        <x-content-tabs />
    </main>

    {{-- Keep existing modals --}}
    <x-file-upload />
    <x-subject-profile-modal />
</div>
@endsection

@push('scripts')
    {{-- Pass route parameters to JavaScript --}}
    <script>
        // Set route parameters for dashboard
        window.dashboardRouteParams = {
            selectedSubject: @json($selectedSubject ?? null),
            searchQuery: @json($searchQuery ?? null),
            profileSubject: @json($profileSubject ?? null),
            filterUserId: @json($filterUserId ?? null),
            filterUserName: @json($filterUserName ?? null)
        };
    </script>

    {{-- Load redesigned dashboard JavaScript --}}
    @vite('resources/js/dashboard-redesign.js')
@endpush

@push('styles')
    <style>
        /* Dashboard Redesign Layout Adjustments */
        .dashboard-redesign {
            display: flex;
            min-height: 100vh;
        }

        .dashboard-main-content {
            flex: 1;
            max-width: calc(100vw - var(--sidebar-width));
            overflow-x: hidden;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
            .dashboard-main-content {
                margin-left: 0 !important;
                max-width: 100vw;
                padding: var(--spacing-lg) !important;
            }
        }

        /* Hide old dashboard elements if present */
        .dashboard-container .files-section {
            display: none;
        }
    </style>
@endpush
