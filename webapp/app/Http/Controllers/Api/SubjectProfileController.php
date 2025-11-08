<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubjectProfile;
use Illuminate\Http\Request;

class SubjectProfileController extends Controller
{
    /**
     * Get all subject profiles
     */
    public function index(Request $request)
    {
        $profiles = SubjectProfile::with(['creator:id,name', 'updater:id,name'])
            ->withCount('uploadedFiles')
            ->orderBy('subject_name')
            ->get();

        return response()->json(['profiles' => $profiles]);
    }

    /**
     * Get a single subject profile
     */
    public function show(string $subjectName)
    {
        $profile = SubjectProfile::where('subject_name', $subjectName)
            ->with(['creator:id,name', 'updater:id,name'])
            ->withCount('uploadedFiles')
            ->first();

        if (!$profile) {
            return response()->json([
                'profile' => null,
                'message' => 'No profile found for this subject'
            ], 404);
        }

        return response()->json(['profile' => $profile]);
    }

    /**
     * Create a new subject profile
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'subject_name' => 'required|string|max:255|unique:subject_profiles,subject_name',
            'description' => 'nullable|string',
            'professor_name' => 'nullable|string|max:255',
            'course_code' => 'nullable|string|max:50',
            'semester' => 'nullable|string|max:50',
            'year' => 'nullable|integer|min:2000|max:2100',
            'notes' => 'nullable|string',
            'color' => 'nullable|string|max:7', // hex color
            'credits' => 'nullable|integer|min:0|max:20',
        ]);

        $validated['created_by'] = $request->user()->id;
        $validated['updated_by'] = $request->user()->id;

        $profile = SubjectProfile::create($validated);

        return response()->json([
            'message' => 'Subject profile created successfully',
            'profile' => $profile->load(['creator:id,name', 'updater:id,name'])
                ->loadCount('uploadedFiles')
        ], 201);
    }

    /**
     * Update an existing subject profile
     */
    public function update(Request $request, string $subjectName)
    {
        $profile = SubjectProfile::where('subject_name', $subjectName)->firstOrFail();

        $validated = $request->validate([
            'description' => 'nullable|string',
            'professor_name' => 'nullable|string|max:255',
            'course_code' => 'nullable|string|max:50',
            'semester' => 'nullable|string|max:50',
            'year' => 'nullable|integer|min:2000|max:2100',
            'notes' => 'nullable|string',
            'color' => 'nullable|string|max:7',
            'credits' => 'nullable|integer|min:0|max:20',
        ]);

        $validated['updated_by'] = $request->user()->id;

        $profile->update($validated);

        return response()->json([
            'message' => 'Subject profile updated successfully',
            'profile' => $profile->load(['creator:id,name', 'updater:id,name'])
                ->loadCount('uploadedFiles')
        ]);
    }

    /**
     * Delete a subject profile
     */
    public function destroy(Request $request, string $subjectName)
    {
        $profile = SubjectProfile::where('subject_name', $subjectName)->firstOrFail();

        $profile->delete();

        return response()->json([
            'message' => 'Subject profile deleted successfully'
        ]);
    }
}
