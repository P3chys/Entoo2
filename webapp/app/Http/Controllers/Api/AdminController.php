<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UploadedFile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

class AdminController extends Controller
{
    /**
     * Clear all admin-related caches
     */
    private function clearAdminCache()
    {
        \Cache::forget('admin:stats');
        // Clear all cached user pages (wildcards not supported, so we clear what we know)
        for ($i = 1; $i <= 10; $i++) {
            \Cache::forget("admin:users:page:{$i}:search:".md5(''));
        }
    }

    #[OA\Get(
        path: '/api/admin/users',
        summary: 'Get all users with pagination',
        description: 'Returns a paginated list of all users with file counts. Supports search by name or email. Cached for 5 minutes per page/search combination. Admin only.',
        security: [['sanctum' => []]],
        tags: ['Admin'],
        parameters: [
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 15), description: 'Results per page'),
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 1), description: 'Page number'),
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string'), description: 'Search by name or email'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Paginated users list',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(property: 'current_page', type: 'integer'),
                        new OA\Property(property: 'total', type: 'integer'),
                        new OA\Property(property: 'per_page', type: 'integer'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Admin only'),
        ]
    )]
    public function getUsers(Request $request)
    {
        $perPage = $request->input('per_page', 15);
        $search = $request->input('search', '');
        $page = $request->input('page', 1);

        $cacheKey = "admin:users:page:{$page}:search:".md5($search);

        $users = \Cache::remember($cacheKey, 300, function () use ($search, $perPage) {
            $query = User::query();

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ILIKE', "%{$search}%")
                        ->orWhere('email', 'ILIKE', "%{$search}%");
                });
            }

            return $query->withCount('uploadedFiles')
                ->orderBy('created_at', 'desc')
                ->paginate($perPage);
        });

        return response()->json($users);
    }

    #[OA\Post(
        path: '/api/admin/users',
        summary: 'Create a new user',
        description: 'Creates a new user account. Admin only.',
        security: [['sanctum' => []]],
        tags: ['Admin'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name', 'email', 'password'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', maxLength: 255, example: 'John Doe'),
                    new OA\Property(property: 'email', type: 'string', format: 'email', maxLength: 255, example: 'john@example.com'),
                    new OA\Property(property: 'password', type: 'string', format: 'password', minLength: 8, example: 'password123'),
                    new OA\Property(property: 'is_admin', type: 'boolean', example: false),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'User created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'User created successfully'),
                        new OA\Property(property: 'user', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Validation error (e.g., email already exists)'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Admin only'),
        ]
    )]
    public function createUser(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'is_admin' => 'boolean',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_admin' => $validated['is_admin'] ?? false,
        ]);

        // Clear admin cache
        $this->clearAdminCache();

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user,
        ], 201);
    }

    #[OA\Put(
        path: '/api/admin/users/{userId}',
        summary: 'Update a user',
        description: 'Updates user information. All fields are optional. Admin only.',
        security: [['sanctum' => []]],
        tags: ['Admin'],
        parameters: [
            new OA\Parameter(name: 'userId', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'User ID'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', maxLength: 255, example: 'John Doe'),
                    new OA\Property(property: 'email', type: 'string', format: 'email', maxLength: 255, example: 'john@example.com'),
                    new OA\Property(property: 'password', type: 'string', format: 'password', minLength: 8, example: 'newpassword123'),
                    new OA\Property(property: 'is_admin', type: 'boolean', example: false),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'User updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'User updated successfully'),
                        new OA\Property(property: 'user', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'User not found'),
            new OA\Response(response: 422, description: 'Validation error'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Admin only'),
        ]
    )]
    public function updateUser(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'sometimes|string|min:8',
            'is_admin' => 'sometimes|boolean',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        // Clear admin cache
        $this->clearAdminCache();

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->fresh(),
        ]);
    }

    #[OA\Delete(
        path: '/api/admin/users/{userId}',
        summary: 'Delete a user',
        description: 'Deletes a user account. Cannot delete your own account. Admin only.',
        security: [['sanctum' => []]],
        tags: ['Admin'],
        parameters: [
            new OA\Parameter(name: 'userId', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'User ID'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'User deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'User deleted successfully'),
                    ]
                )
            ),
            new OA\Response(
                response: 403,
                description: 'Forbidden - Cannot delete own account or admin only',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'You cannot delete your own account'),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'User not found'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function deleteUser(User $user)
    {
        // Prevent deleting yourself
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'You cannot delete your own account',
            ], 403);
        }

        $user->delete();

        // Clear admin cache
        $this->clearAdminCache();

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }

    #[OA\Get(
        path: '/api/admin/files',
        summary: 'Get all files with pagination and filters',
        description: 'Returns a paginated list of all files. Supports filtering by search query, subject, category, and user. Cached for 5 minutes per page/filter combination. Admin only.',
        security: [['sanctum' => []]],
        tags: ['Admin'],
        parameters: [
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 15), description: 'Results per page'),
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 1), description: 'Page number'),
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string'), description: 'Search by filename or subject name'),
            new OA\Parameter(name: 'subject', in: 'query', required: false, schema: new OA\Schema(type: 'string'), description: 'Filter by subject name'),
            new OA\Parameter(name: 'category', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['Prednasky', 'Otazky', 'Materialy', 'Seminare']), description: 'Filter by category'),
            new OA\Parameter(name: 'user_id', in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Filter by user ID'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Paginated files list',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(property: 'current_page', type: 'integer'),
                        new OA\Property(property: 'total', type: 'integer'),
                        new OA\Property(property: 'per_page', type: 'integer'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Admin only'),
        ]
    )]
    public function getFiles(Request $request)
    {
        $perPage = $request->input('per_page', 15);
        $search = $request->input('search', '');
        $subject = $request->input('subject', '');
        $category = $request->input('category', '');
        $userId = $request->input('user_id', '');
        $page = $request->input('page', 1);

        $cacheKey = "admin:files:page:{$page}:".md5($search.$subject.$category.$userId);

        $files = \Cache::remember($cacheKey, 300, function () use ($search, $subject, $category, $userId, $perPage) {
            $query = UploadedFile::with('user:id,name,email');

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('original_filename', 'ILIKE', "%{$search}%")
                        ->orWhere('subject_name', 'ILIKE', "%{$search}%");
                });
            }

            if ($subject) {
                $query->where('subject_name', $subject);
            }

            if ($category) {
                $query->where('category', $category);
            }

            if ($userId) {
                $query->where('user_id', $userId);
            }

            return $query->orderBy('created_at', 'desc')
                ->paginate($perPage);
        });

        return response()->json($files);
    }

    #[OA\Delete(
        path: '/api/admin/files/{fileId}',
        summary: 'Delete a file',
        description: 'Deletes a file from storage, database, and Elasticsearch index. Admin can delete any file. Admin only.',
        security: [['sanctum' => []]],
        tags: ['Admin'],
        parameters: [
            new OA\Parameter(name: 'fileId', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'File ID'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'File deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'File deleted successfully'),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'File not found'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Admin only'),
        ]
    )]
    public function deleteFile(UploadedFile $file)
    {
        // Delete physical file
        if (\Storage::exists($file->filepath)) {
            \Storage::delete($file->filepath);
        }

        // Remove from Elasticsearch
        try {
            app(\App\Services\ElasticsearchService::class)->deleteDocument($file->id);
        } catch (\Exception $e) {
            \Log::warning("Failed to delete file from Elasticsearch: {$e->getMessage()}");
        }

        // Delete database record
        $file->delete();

        // Clear admin cache
        $this->clearAdminCache();

        return response()->json([
            'message' => 'File deleted successfully',
        ]);
    }

    #[OA\Get(
        path: '/api/admin/stats',
        summary: 'Get admin dashboard statistics',
        description: 'Returns comprehensive statistics for the admin dashboard including total counts, recent users, and recent files. Cached for 5 minutes. Admin only.',
        security: [['sanctum' => []]],
        tags: ['Admin'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Admin dashboard statistics',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'total_users', type: 'integer', example: 42),
                        new OA\Property(property: 'total_files', type: 'integer', example: 1250),
                        new OA\Property(property: 'total_subjects', type: 'integer', example: 35),
                        new OA\Property(property: 'total_storage', type: 'integer', example: 524288000),
                        new OA\Property(
                            property: 'recent_users',
                            type: 'array',
                            items: new OA\Items(
                                type: 'object',
                                properties: [
                                    new OA\Property(property: 'id', type: 'integer'),
                                    new OA\Property(property: 'name', type: 'string'),
                                    new OA\Property(property: 'email', type: 'string'),
                                    new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
                                ]
                            )
                        ),
                        new OA\Property(
                            property: 'recent_files',
                            type: 'array',
                            items: new OA\Items(
                                type: 'object',
                                properties: [
                                    new OA\Property(property: 'id', type: 'integer'),
                                    new OA\Property(property: 'original_filename', type: 'string'),
                                    new OA\Property(property: 'subject_name', type: 'string'),
                                    new OA\Property(property: 'user_id', type: 'integer'),
                                    new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
                                    new OA\Property(property: 'file_size', type: 'integer'),
                                ]
                            )
                        ),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Admin only'),
        ]
    )]
    public function getStats()
    {
        $stats = \Cache::remember('admin:stats', 300, function () {
            return [
                'total_users' => User::count(),
                'total_files' => UploadedFile::count(),
                'total_subjects' => UploadedFile::distinct('subject_name')->count('subject_name'),
                'total_storage' => UploadedFile::sum('file_size'),
                'recent_users' => User::orderBy('created_at', 'desc')->take(5)->get(['id', 'name', 'email', 'created_at']),
                'recent_files' => UploadedFile::with('user:id,name')
                    ->orderBy('created_at', 'desc')
                    ->take(5)
                    ->get(['id', 'original_filename', 'subject_name', 'user_id', 'created_at', 'file_size']),
            ];
        });

        return response()->json($stats);
    }
}
