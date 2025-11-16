<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubjectProfile;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class SubjectProfileController extends Controller
{
    #[OA\Get(
        path: '/api/subject-profiles',
        summary: 'Get all subject profiles',
        description: 'Returns list of all subject profiles with file counts, creator and updater information.',
        security: [['sanctum' => []]],
        tags: ['Subject Profiles'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Subject profiles list',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'profiles', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function index(Request $request)
    {
        $profiles = SubjectProfile::with(['creator:id,name', 'updater:id,name'])
            ->withCount('uploadedFiles')
            ->orderBy('subject_name')
            ->get();

        return response()->json(['profiles' => $profiles]);
    }

    #[OA\Get(
        path: '/api/subject-profiles/{subjectName}',
        summary: 'Get a single subject profile',
        description: 'Returns detailed information about a specific subject profile.',
        security: [['sanctum' => []]],
        tags: ['Subject Profiles'],
        parameters: [
            new OA\Parameter(name: 'subjectName', in: 'path', required: true, schema: new OA\Schema(type: 'string'), description: 'Subject name'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Subject profile found',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'profile',
                            type: 'object',
                            properties: [
                                new OA\Property(property: 'id', type: 'integer'),
                                new OA\Property(property: 'subject_name', type: 'string'),
                                new OA\Property(property: 'description', type: 'string', nullable: true),
                                new OA\Property(property: 'professor_name', type: 'string', nullable: true),
                                new OA\Property(property: 'course_code', type: 'string', nullable: true),
                                new OA\Property(property: 'semester', type: 'string', nullable: true),
                                new OA\Property(property: 'year', type: 'integer', nullable: true),
                                new OA\Property(property: 'notes', type: 'string', nullable: true),
                                new OA\Property(property: 'color', type: 'string', nullable: true),
                                new OA\Property(property: 'credits', type: 'integer', nullable: true),
                                new OA\Property(property: 'uploaded_files_count', type: 'integer'),
                                new OA\Property(property: 'creator', type: 'object'),
                                new OA\Property(property: 'updater', type: 'object'),
                            ]
                        ),
                    ]
                )
            ),
            new OA\Response(
                response: 404,
                description: 'Profile not found',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'profile', type: 'null'),
                        new OA\Property(property: 'message', type: 'string', example: 'No profile found for this subject'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
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

    #[OA\Post(
        path: '/api/subject-profiles',
        summary: 'Create a new subject profile',
        description: 'Creates a new subject profile with detailed information about a course.',
        security: [['sanctum' => []]],
        tags: ['Subject Profiles'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['subject_name'],
                properties: [
                    new OA\Property(property: 'subject_name', type: 'string', maxLength: 255, example: 'Matematická analýza'),
                    new OA\Property(property: 'description', type: 'string', nullable: true, example: 'Základy matematické analýzy'),
                    new OA\Property(property: 'professor_name', type: 'string', maxLength: 255, nullable: true, example: 'Prof. Jan Novák'),
                    new OA\Property(property: 'course_code', type: 'string', maxLength: 50, nullable: true, example: 'MAT101'),
                    new OA\Property(property: 'semester', type: 'string', maxLength: 50, nullable: true, example: 'Zimní'),
                    new OA\Property(property: 'year', type: 'integer', minimum: 2000, maximum: 2100, nullable: true, example: 2024),
                    new OA\Property(property: 'notes', type: 'string', nullable: true, example: 'Obtížný předmět, hodně přednášek'),
                    new OA\Property(property: 'color', type: 'string', maxLength: 7, nullable: true, example: '#FF5733'),
                    new OA\Property(property: 'credits', type: 'integer', minimum: 0, maximum: 20, nullable: true, example: 6),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Subject profile created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Subject profile created successfully'),
                        new OA\Property(property: 'profile', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Validation error (e.g., subject already exists)'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
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

    #[OA\Put(
        path: '/api/subject-profiles/{subjectName}',
        summary: 'Update an existing subject profile',
        description: 'Updates profile information for a subject. Subject name cannot be changed.',
        security: [['sanctum' => []]],
        tags: ['Subject Profiles'],
        parameters: [
            new OA\Parameter(name: 'subjectName', in: 'path', required: true, schema: new OA\Schema(type: 'string'), description: 'Subject name'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'description', type: 'string', nullable: true, example: 'Aktualizovaný popis předmětu'),
                    new OA\Property(property: 'professor_name', type: 'string', maxLength: 255, nullable: true, example: 'Prof. Jan Novák'),
                    new OA\Property(property: 'course_code', type: 'string', maxLength: 50, nullable: true, example: 'MAT101'),
                    new OA\Property(property: 'semester', type: 'string', maxLength: 50, nullable: true, example: 'Zimní'),
                    new OA\Property(property: 'year', type: 'integer', minimum: 2000, maximum: 2100, nullable: true, example: 2024),
                    new OA\Property(property: 'notes', type: 'string', nullable: true, example: 'Aktualizované poznámky'),
                    new OA\Property(property: 'color', type: 'string', maxLength: 7, nullable: true, example: '#FF5733'),
                    new OA\Property(property: 'credits', type: 'integer', minimum: 0, maximum: 20, nullable: true, example: 6),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Subject profile updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Subject profile updated successfully'),
                        new OA\Property(property: 'profile', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Profile not found'),
            new OA\Response(response: 422, description: 'Validation error'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
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

    #[OA\Delete(
        path: '/api/subject-profiles/{subjectName}',
        summary: 'Delete a subject profile',
        description: 'Deletes a subject profile. Does not delete associated files.',
        security: [['sanctum' => []]],
        tags: ['Subject Profiles'],
        parameters: [
            new OA\Parameter(name: 'subjectName', in: 'path', required: true, schema: new OA\Schema(type: 'string'), description: 'Subject name'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Subject profile deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Subject profile deleted successfully'),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Profile not found'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function destroy(Request $request, string $subjectName)
    {
        $profile = SubjectProfile::where('subject_name', $subjectName)->firstOrFail();

        $profile->delete();

        return response()->json([
            'message' => 'Subject profile deleted successfully'
        ]);
    }
}
