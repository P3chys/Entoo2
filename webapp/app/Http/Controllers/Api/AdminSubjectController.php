<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubjectProfile;
use App\Models\UploadedFile;
use App\Services\ElasticsearchService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use OpenApi\Attributes as OA;

class AdminSubjectController extends Controller
{
    private ElasticsearchService $elasticsearchService;

    public function __construct(ElasticsearchService $elasticsearchService)
    {
        $this->elasticsearchService = $elasticsearchService;
    }

    #[OA\Get(
        path: '/api/admin/subjects',
        summary: 'Get all subjects for admin',
        description: 'Returns a list of all subjects, merging those with profiles and those found only in files. Admin only.',
        security: [['sanctum' => []]],
        tags: ['Admin'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Subjects list',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'subjects', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Admin only'),
        ]
    )]
    public function index()
    {
        // Get all profiles
        $profiles = SubjectProfile::withCount('uploadedFiles')->get()->keyBy('subject_name');

        // Get all subjects from files (some might not have profiles)
        $fileSubjects = UploadedFile::select('subject_name', DB::raw('count(*) as file_count'))
            ->groupBy('subject_name')
            ->get()
            ->keyBy('subject_name');

        // Merge them
        $allSubjectNames = $profiles->keys()->merge($fileSubjects->keys())->unique()->sort();

        $subjects = $allSubjectNames->map(function ($name) use ($profiles, $fileSubjects) {
            $profile = $profiles->get($name);
            $fileData = $fileSubjects->get($name);

            return [
                'subject_name' => $name,
                'has_profile' => (bool) $profile,
                'file_count' => $fileData ? $fileData->file_count : 0,
                'profile_id' => $profile ? $profile->id : null,
                'description' => $profile ? $profile->description : null,
                'updated_at' => $profile ? $profile->updated_at : null,
            ];
        })->values();

        return response()->json(['subjects' => $subjects]);
    }

    #[OA\Post(
        path: '/api/admin/subjects',
        summary: 'Create a new subject profile',
        description: 'Creates a new subject profile. Admin only.',
        security: [['sanctum' => []]],
        tags: ['Admin'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['subject_name'],
                properties: [
                    new OA\Property(property: 'subject_name', type: 'string', maxLength: 255),
                    new OA\Property(property: 'description', type: 'string', nullable: true),
                    new OA\Property(property: 'professor_name', type: 'string', nullable: true),
                    new OA\Property(property: 'course_code', type: 'string', nullable: true),
                    new OA\Property(property: 'semester', type: 'string', nullable: true),
                    new OA\Property(property: 'year', type: 'integer', nullable: true),
                    new OA\Property(property: 'credits', type: 'integer', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Subject created'),
            new OA\Response(response: 422, description: 'Validation error'),
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
            'credits' => 'nullable|integer|min:0|max:20',
        ]);

        $validated['created_by'] = $request->user()->id;
        $validated['updated_by'] = $request->user()->id;

        $profile = SubjectProfile::create($validated);

        return response()->json([
            'message' => 'Subject created successfully',
            'subject' => $profile
        ], 201);
    }

    #[OA\Put(
        path: '/api/admin/subjects/{id}',
        summary: 'Update a subject',
        description: 'Updates a subject profile. If name changes, it updates all associated files and Elasticsearch documents. Admin only.',
        security: [['sanctum' => []]],
        tags: ['Admin'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'subject_name', type: 'string', maxLength: 255),
                    new OA\Property(property: 'description', type: 'string', nullable: true),
                    // ... other fields
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Subject updated'),
            new OA\Response(response: 404, description: 'Subject not found'),
        ]
    )]
    public function update(Request $request, $id)
    {
        $profile = SubjectProfile::findOrFail($id);
        $oldName = $profile->subject_name;

        $validated = $request->validate([
            'subject_name' => 'sometimes|required|string|max:255|unique:subject_profiles,subject_name,' . $id,
            'description' => 'nullable|string',
            'professor_name' => 'nullable|string|max:255',
            'course_code' => 'nullable|string|max:50',
            'semester' => 'nullable|string|max:50',
            'year' => 'nullable|integer|min:2000|max:2100',
            'credits' => 'nullable|integer|min:0|max:20',
        ]);

        $validated['updated_by'] = $request->user()->id;

        DB::beginTransaction();
        try {
            $profile->update($validated);

            // Handle renaming
            if (isset($validated['subject_name']) && $validated['subject_name'] !== $oldName) {
                $newName = $validated['subject_name'];

                // Update files in DB
                UploadedFile::where('subject_name', $oldName)->update(['subject_name' => $newName]);

                // Update files in Elasticsearch
                // We'll do this after commit to avoid holding DB lock, but for now let's do it here or queue it
                // For simplicity in this task, we'll call service directly
                $this->elasticsearchService->updateSubjectName($oldName, $newName);
            }

            DB::commit();

            return response()->json([
                'message' => 'Subject updated successfully',
                'subject' => $profile
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to update subject: " . $e->getMessage());
            return response()->json(['message' => 'Failed to update subject'], 500);
        }
    }

    #[OA\Delete(
        path: '/api/admin/subjects/{id}',
        summary: 'Delete a subject',
        description: 'Deletes a subject profile AND all associated files. Admin only.',
        security: [['sanctum' => []]],
        tags: ['Admin'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Subject deleted'),
            new OA\Response(response: 404, description: 'Subject not found'),
        ]
    )]
    public function destroy($id)
    {
        $profile = SubjectProfile::findOrFail($id);
        $subjectName = $profile->subject_name;

        DB::beginTransaction();
        try {
            // Get all files to delete physical files later
            $files = UploadedFile::where('subject_name', $subjectName)->get();

            // Delete from DB
            UploadedFile::where('subject_name', $subjectName)->delete();
            $profile->delete();

            // Delete from Elasticsearch
            foreach ($files as $file) {
                $this->elasticsearchService->deleteDocument($file->id);
            }

            DB::commit();

            // Delete physical files (after commit)
            foreach ($files as $file) {
                if (\Storage::exists($file->filepath)) {
                    \Storage::delete($file->filepath);
                }
            }

            return response()->json(['message' => 'Subject and associated files deleted successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to delete subject: " . $e->getMessage());
            return response()->json(['message' => 'Failed to delete subject'], 500);
        }
    }
}
