<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessUploadedFile;
use App\Models\UploadedFile;
use App\Services\DocumentParserService;
use App\Services\ElasticsearchService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileController extends Controller
{
    private DocumentParserService $parserService;
    private ElasticsearchService $elasticsearchService;

    public function __construct(
        DocumentParserService $parserService,
        ElasticsearchService $elasticsearchService
    ) {
        $this->parserService = $parserService;
        $this->elasticsearchService = $elasticsearchService;
    }

    /**
     * List all files (visible to all authenticated users)
     * Cached for 5 minutes
     * Uses Elasticsearch for much faster performance when filtering by subject
     */
    public function index(Request $request)
    {
        // Use Elasticsearch when filtering by subject only (most common use case)
        // This is MUCH faster than PostgreSQL + ORM
        if ($request->has('subject_name') &&
            !$request->has('category') &&
            !$request->has('extension') &&
            !$request->has('user_id')) {

            $cacheKey = 'files:es:subject:' . md5($request->subject_name);

            $files = Cache::tags(['files', 'subjects'])->remember($cacheKey, 300, function () use ($request) {
                $size = min($request->input('per_page', 1000), 1000);
                return $this->elasticsearchService->getFilesBySubject($request->subject_name, $size);
            });

            // Return in a format compatible with the frontend
            return response()->json([
                'data' => $files,
                'total' => count($files)
            ]);
        }

        // Fall back to PostgreSQL for complex queries
        $cacheKey = 'files:' . md5(json_encode([
            'subject' => $request->subject_name,
            'category' => $request->category,
            'extension' => $request->extension,
            'user_id' => $request->user_id,
            'per_page' => $request->input('per_page', 20),
            'page' => $request->input('page', 1)
        ]));

        $files = Cache::tags(['files'])->remember($cacheKey, 300, function () use ($request) {
            $query = UploadedFile::with('user:id,name,email');

            // Filter by subject
            if ($request->has('subject_name')) {
                $query->where('subject_name', $request->subject_name);
            }

            // Filter by category
            if ($request->has('category')) {
                $query->where('category', $request->category);
            }

            // Filter by extension
            if ($request->has('extension')) {
                $query->where('file_extension', $request->extension);
            }

            // Filter by user/owner
            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            // Respect per_page parameter (default 20, max 1000)
            $perPage = min($request->input('per_page', 20), 1000);
            return $query->orderBy('created_at', 'desc')->paginate($perPage);
        });

        return response()->json($files);
    }

    /**
     * Upload a new file
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|max:51200', // 50MB max
            'subject_name' => 'required|string|max:200',
            'category' => 'required|string|in:Prednasky,Otazky,Materialy,Seminare',
        ]);

        try {
            $uploadedFile = $request->file('file');
            $extension = strtolower($uploadedFile->getClientOriginalExtension());

            // Check if file type is supported
            if (!$this->parserService->isSupported($extension)) {
                return response()->json([
                    'message' => 'Unsupported file type',
                    'supported_types' => $this->parserService->getSupportedExtensions()
                ], 422);
            }

            // Generate unique filename
            $filename = Str::uuid() . '.' . $extension;
            $subjectSlug = Str::slug($validated['subject_name']);
            $categorySlug = Str::slug($validated['category']);

            // Store file
            $path = $uploadedFile->storeAs(
                "uploads/{$subjectSlug}/{$categorySlug}",
                $filename,
                'local'
            );

            // Create database record with pending status
            $file = UploadedFile::create([
                'user_id' => $request->user()->id,
                'filename' => $filename,
                'original_filename' => $uploadedFile->getClientOriginalName(),
                'filepath' => $path,
                'subject_name' => $validated['subject_name'],
                'category' => $validated['category'],
                'file_size' => $uploadedFile->getSize(),
                'file_extension' => $extension,
                'processing_status' => 'pending',
            ]);

            // Dispatch job to process file asynchronously
            ProcessUploadedFile::dispatch($file);

            return response()->json([
                'message' => 'File uploaded successfully and is being processed',
                'file' => $file,
                'status' => 'processing'
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'message' => 'File upload failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get file details
     */
    public function show(Request $request, int $id)
    {
        $file = UploadedFile::findOrFail($id);

        // Authorize the view action
        $this->authorize('view', $file);

        return response()->json(['file' => $file]);
    }

    /**
     * Get processing status for a file
     */
    public function status(Request $request, int $id)
    {
        $file = UploadedFile::findOrFail($id);

        // Authorize the view action
        $this->authorize('view', $file);

        return response()->json([
            'id' => $file->id,
            'processing_status' => $file->processing_status,
            'processing_error' => $file->processing_error,
            'processed_at' => $file->processed_at,
        ]);
    }

    /**
     * Download file
     *
     * Authorization: All authenticated users can download files (document sharing platform)
     */
    public function download(Request $request, int $id)
    {
        $file = UploadedFile::findOrFail($id);

        // Note: Authorization check removed - route is already protected by auth:sanctum middleware
        // The FilePolicy allows any authenticated user to download, making this check redundant
        // and it was causing 403 errors in Octane due to timing issues with $request->user()

        // Optimize: Check if path is absolute first (imported files from old_entoo)
        // This avoids slow Storage::exists() calls for absolute paths
        if (str_starts_with($file->filepath, '/') || preg_match('/^[A-Za-z]:/', $file->filepath)) {
            // Absolute path - imported file
            if (file_exists($file->filepath)) {
                return response()->download($file->filepath, $file->original_filename);
            }
        }

        // Try Laravel storage for relative paths (uploaded files)
        $storagePath = storage_path('app/' . $file->filepath);
        if (file_exists($storagePath)) {
            return response()->download($storagePath, $file->original_filename);
        }

        return response()->json([
            'message' => 'File not found on disk'
        ], 404);
    }

    /**
     * Delete file (only owner can delete)
     */
    public function destroy(Request $request, int $id)
    {
        $file = UploadedFile::findOrFail($id);

        // Authorize the delete action
        $this->authorize('delete', $file);

        try {
            // Delete from storage
            if (Storage::exists($file->filepath)) {
                Storage::delete($file->filepath);
            }

            // Delete from Elasticsearch
            try {
                $this->elasticsearchService->deleteDocument($file->id);
            } catch (Exception $e) {
                \Log::warning("Failed to delete file from Elasticsearch", [
                    'file_id' => $file->id,
                    'error' => $e->getMessage()
                ]);
            }

            // Delete from database
            $file->delete();

            // Clear all relevant caches
            $this->clearFileRelatedCaches();

            return response()->json([
                'message' => 'File deleted successfully'
            ]);

        } catch (Exception $e) {
            return response()->json([
                'message' => 'File deletion failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Browse files by subject and category
     * Cached for 5 minutes
     */
    public function browse(Request $request)
    {
        $request->validate([
            'subject_name' => 'sometimes|string|max:200',
            'category' => 'sometimes|string|in:Prednasky,Otazky,Materialy,Seminare',
            'user_id' => 'sometimes|integer|exists:users,id',
        ]);

        // Build cache key from query parameters
        $cacheKey = 'files:browse:' . md5(json_encode([
            'subject' => $request->subject_name,
            'category' => $request->category,
            'user_id' => $request->user_id,
            'page' => $request->input('page', 1)
        ]));

        $files = Cache::tags(['files'])->remember($cacheKey, 300, function () use ($request) {
            $query = UploadedFile::with('user:id,name,email');

            if ($request->has('subject_name')) {
                $query->where('subject_name', $request->subject_name);
            }

            if ($request->has('category')) {
                $query->where('category', $request->category);
            }

            // Allow filtering by user_id
            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            return $query->orderBy('created_at', 'desc')->paginate(20);
        });

        return response()->json($files);
    }

    /**
     * Clear all file-related caches
     * Clears both tagged caches and simple keys for optimal performance
     */
    private function clearFileRelatedCaches()
    {
        // Clear all caches tagged with 'files'
        // This includes: file listings, browse results, and subject file counts
        Cache::tags(['files'])->flush();

        // Clear subjects cache (affected by file uploads/deletes)
        Cache::tags(['subjects'])->flush();

        // Clear simple cache keys for better Octane performance
        Cache::forget('system:stats:comprehensive');
        Cache::forget('subjects:with_counts');
        Cache::forget('subjects:list');
    }
}
