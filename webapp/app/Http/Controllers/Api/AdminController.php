<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UploadedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    /**
     * Get all users with pagination
     */
    public function getUsers(Request $request)
    {
        $perPage = $request->input('per_page', 15);
        $search = $request->input('search');

        $query = User::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%");
            });
        }

        $users = $query->withCount('uploadedFiles')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json($users);
    }

    /**
     * Create a new user
     */
    public function createUser(Request $request)
    {
        // Debug: Log raw request data
        \Log::info('Create user - Raw request:', $request->all());

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'is_admin' => 'boolean',
        ]);

        // Debug: Log validated data
        \Log::info('Create user - Validated data:', $validated);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_admin' => $validated['is_admin'] ?? false,
        ]);

        // Debug: Log created user
        \Log::info('Create user - Created user:', $user->toArray());

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user,
        ], 201);
    }

    /**
     * Update a user
     */
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

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->fresh(),
        ]);
    }

    /**
     * Delete a user
     */
    public function deleteUser(User $user)
    {
        // Prevent deleting yourself
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'You cannot delete your own account',
            ], 403);
        }

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }

    /**
     * Get all files with pagination and filters
     */
    public function getFiles(Request $request)
    {
        $perPage = $request->input('per_page', 15);
        $search = $request->input('search');
        $subject = $request->input('subject');
        $category = $request->input('category');
        $userId = $request->input('user_id');

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

        $files = $query->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json($files);
    }

    /**
     * Delete a file (admin can delete any file)
     */
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

        return response()->json([
            'message' => 'File deleted successfully',
        ]);
    }

    /**
     * Get dashboard statistics
     */
    public function getStats()
    {
        $stats = [
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

        return response()->json($stats);
    }
}
