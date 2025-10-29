@extends('layouts.app')

@section('title', 'Dashboard - Entoo')

@section('content')
<div class="dashboard-container">
    <div class="container">
        <x-search :searchQuery="$searchQuery ?? null" />
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
