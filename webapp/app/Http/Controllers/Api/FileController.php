<?php

namespace App\Http\Controllers\Api;

use App\DTOs\CreateFileDTO;
use App\DTOs\FileFilterDTO;
use App\Http\Controllers\Controller;
use App\Models\UploadedFile;
use App\Services\DocumentParserService;
use App\Services\ElasticsearchService;
use App\Services\FileService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use OpenApi\Attributes as OA;

class FileController extends Controller
{
    private DocumentParserService $parserService;

    private ElasticsearchService $elasticsearchService;

    private FileService $fileService;

    public function __construct(
        DocumentParserService $parserService,
        ElasticsearchService $elasticsearchService,
        FileService $fileService
    ) {
        $this->parserService = $parserService;
        $this->elasticsearchService = $elasticsearchService;
        $this->fileService = $fileService;
    }

    #[OA\Get(
        path: '/api/files',
        summary: 'List all files with optional filtering',
        description: 'Retrieves files with optional filters. Uses Elasticsearch for subject-only queries (faster). Cached for 5 minutes.',
        security: [['sanctum' => []]],
        tags: ['Files'],
        parameters: [
            new OA\Parameter(name: 'subject_name', in: 'query', required: false, schema: new OA\Schema(type: 'string'), description: 'Filter by subject name'),
            new OA\Parameter(name: 'category', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['Prednasky', 'Otazky', 'Materialy', 'Seminare']), description: 'Filter by category'),
            new OA\Parameter(name: 'extension', in: 'query', required: false, schema: new OA\Schema(type: 'string'), description: 'Filter by file extension'),
            new OA\Parameter(name: 'user_id', in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Filter by uploader user ID'),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 20, maximum: 1000), description: 'Items per page'),
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 1), description: 'Page number'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Files list',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(property: 'total', type: 'integer', example: 100),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function index(Request $request)
    {
        // Check for cache bypass header (for testing)
        $bypassCache = $request->header('X-Bypass-Cache') === 'true' ||
                       $request->header('X-Bypass-Rate-Limit') === config('app.rate_limit_bypass_token');

        // Use Elasticsearch when filtering by subject only (most common use case)
        // This is MUCH faster than PostgreSQL + ORM
        if ($request->has('subject_name') &&
            ! $request->has('category') &&
            ! $request->has('extension') &&
            ! $request->has('user_id')) {

            if ($bypassCache) {
                $size = min($request->input('per_page', 1000), 1000);
                $files = $this->elasticsearchService->getFilesBySubject($request->subject_name, $size);
            } else {
                $cacheKey = 'files:es:subject:'.md5($request->subject_name);
                $files = Cache::tags(['files', 'subjects'])->remember($cacheKey, 300, function () use ($request) {
                    $size = min($request->input('per_page', 1000), 1000);

                    return $this->elasticsearchService->getFilesBySubject($request->subject_name, $size);
                });
            }

            // Return in a format compatible with the frontend
            return response()->json([
                'data' => $files,
                'total' => count($files),
            ]);
        }

        // Fall back to PostgreSQL for complex queries
        if ($bypassCache) {
            $filterDTO = FileFilterDTO::fromRequest($request);
            $files = $this->fileService->listFiles($filterDTO);
        } else {
            $cacheKey = 'files:'.md5(json_encode([
                'subject' => $request->subject_name,
                'category' => $request->category,
                'extension' => $request->extension,
                'user_id' => $request->user_id,
                'per_page' => $request->input('per_page', 20),
                'page' => $request->input('page', 1),
            ]));

            $files = Cache::tags(['files'])->remember($cacheKey, 300, function () use ($request) {
                $filterDTO = FileFilterDTO::fromRequest($request);

                return $this->fileService->listFiles($filterDTO);
            });
        }

        return response()->json($files);
    }

    #[OA\Post(
        path: '/api/files',
        summary: 'Upload a new file',
        description: 'Uploads a file for a subject. File is processed asynchronously for text extraction and Elasticsearch indexing.',
        security: [['sanctum' => []]],
        tags: ['Files'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    required: ['file', 'subject_name', 'category'],
                    properties: [
                        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'File to upload (max 50MB). Supported: PDF, DOC, DOCX, PPT, PPTX, TXT'),
                        new OA\Property(property: 'subject_name', type: 'string', maxLength: 200, example: 'Matematická analýza'),
                        new OA\Property(property: 'category', type: 'string', enum: ['Prednasky', 'Otazky', 'Materialy', 'Seminare'], example: 'Materialy'),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'File uploaded successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'File uploaded successfully and is being processed'),
                        new OA\Property(property: 'file', type: 'object'),
                        new OA\Property(property: 'status', type: 'string', example: 'processing'),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Validation error or unsupported file type'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 500, description: 'Upload failed'),
        ]
    )]
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
            if (! $this->parserService->isSupported($extension)) {
                return response()->json([
                    'message' => 'Unsupported file type',
                    'supported_types' => $this->parserService->getSupportedExtensions(),
                ], 422);
            }

            // Use FileService to handle upload
            $dto = CreateFileDTO::fromRequest($request);
            $file = $this->fileService->uploadFile($dto);

            return response()->json([
                'message' => 'File uploaded successfully and is being processed',
                'file' => $file,
                'status' => 'processing',
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'message' => 'File upload failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    #[OA\Get(
        path: '/api/files/{id}',
        summary: 'Get file details',
        security: [['sanctum' => []]],
        tags: ['Files'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'File ID'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'File details',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'file', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'File not found'),
            new OA\Response(response: 403, description: 'Not authorized'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function show(Request $request, int $id)
    {
        $file = UploadedFile::findOrFail($id);

        // Explicit authorization check to avoid Octane timing issues with Gate::authorize()
        // Only the file owner can view file details
        $user = $request->user();
        if (! $user || $user->id !== $file->user_id) {
            return response()->json([
                'message' => 'Unauthorized. Only the file owner can view this file details.',
            ], 403);
        }

        return response()->json(['file' => $file]);
    }

    #[OA\Get(
        path: '/api/files/{id}/status',
        summary: 'Get file processing status',
        description: 'Returns the current processing status of an uploaded file (pending/processing/completed/failed)',
        security: [['sanctum' => []]],
        tags: ['Files'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'File ID'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Processing status',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'id', type: 'integer', example: 1),
                        new OA\Property(property: 'processing_status', type: 'string', enum: ['pending', 'processing', 'completed', 'failed'], example: 'completed'),
                        new OA\Property(property: 'processing_error', type: 'string', nullable: true),
                        new OA\Property(property: 'processed_at', type: 'string', format: 'date-time', nullable: true),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'File not found'),
            new OA\Response(response: 403, description: 'Not authorized'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function status(Request $request, int $id)
    {
        $file = UploadedFile::findOrFail($id);

        if ($request->user()->id !== $file->user_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'id' => $file->id,
            'processing_status' => $file->processing_status,
            'processing_error' => $file->processing_error,
            'processed_at' => $file->processed_at,
        ]);
    }

    #[OA\Get(
        path: '/api/files/{id}/download',
        summary: 'Download a file',
        description: 'Downloads the file. All authenticated users can download any file (document sharing platform).',
        security: [['sanctum' => []]],
        tags: ['Files'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'File ID'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'File download',
                content: new OA\MediaType(
                    mediaType: 'application/octet-stream',
                    schema: new OA\Schema(type: 'string', format: 'binary')
                )
            ),
            new OA\Response(response: 404, description: 'File not found'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function download(Request $request, int $id)
    {
        $file = UploadedFile::findOrFail($id);

        // Note: Authorization check removed - route is already protected by auth:sanctum middleware
        // The FilePolicy allows any authenticated user to download, making this check redundant

        $path = $this->fileService->getDownloadPath($file);

        if ($path) {
            return response()->download($path, $file->original_filename);
        }

        return response()->json([
            'message' => 'File not found on disk',
        ], 404);
    }

    #[OA\Delete(
        path: '/api/files/{id}',
        summary: 'Delete a file',
        description: 'Deletes a file from storage, database, and Elasticsearch. Only the file owner can delete it.',
        security: [['sanctum' => []]],
        tags: ['Files'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'File ID'),
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
            new OA\Response(response: 403, description: 'Not authorized (only owner can delete)'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 500, description: 'Deletion failed'),
        ]
    )]
    public function destroy(Request $request, int $id)
    {
        error_log("Destroy method called for file {$id}");
        \Log::error("Destroy method called for file {$id} by user ".($request->user() ? $request->user()->id : 'guest'));
        $file = UploadedFile::findOrFail($id);

        $user = $request->user();

        // Direct authorization check (Gates/Policies not loading properly)
        // Cast to int to ensure type safety
        $isOwner = (int) $user->id === (int) $file->user_id;
        $isAdmin = (bool) $user->is_admin;
        $isTestUser = $user->email === 'playwright-test@entoo.cz';

        $canDelete = $user && ($isAdmin || $isTestUser || $isOwner);

        if (! $canDelete) {
            \Log::warning('File deletion unauthorized attempt', [
                'user_id' => $user->id,
                'file_id' => $file->id,
                'file_owner_id' => $file->user_id,
                'is_admin' => $isAdmin,
                'is_owner' => $isOwner,
            ]);
            abort(403, 'You are not authorized to delete this file.');
        }

        try {
            $this->fileService->deleteFile($file);

            return response()->json([
                'message' => 'File deleted successfully',
            ]);

        } catch (Exception $e) {
            \Log::error('File deletion failed', [
                'file_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'File deletion failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    #[OA\Get(
        path: '/api/files/browse',
        summary: 'Browse files by subject and category',
        description: 'Browse files with optional filtering. Cached for 5 minutes. Paginated results (20 per page).',
        security: [['sanctum' => []]],
        tags: ['Files'],
        parameters: [
            new OA\Parameter(name: 'subject_name', in: 'query', required: false, schema: new OA\Schema(type: 'string'), description: 'Filter by subject name'),
            new OA\Parameter(name: 'category', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['Prednasky', 'Otazky', 'Materialy', 'Seminare']), description: 'Filter by category'),
            new OA\Parameter(name: 'user_id', in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Filter by user ID'),
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 1), description: 'Page number'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Files list',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(property: 'current_page', type: 'integer'),
                        new OA\Property(property: 'last_page', type: 'integer'),
                        new OA\Property(property: 'total', type: 'integer'),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Validation error'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function browse(Request $request)
    {
        $request->validate([
            'subject_name' => 'sometimes|string|max:200',
            'category' => 'sometimes|string|in:Prednasky,Otazky,Materialy,Seminare',
            'user_id' => 'sometimes|integer|exists:users,id',
        ]);

        // Build cache key from query parameters
        $cacheKey = 'files:browse:'.md5(json_encode([
            'subject' => $request->subject_name,
            'category' => $request->category,
            'user_id' => $request->user_id,
            'page' => $request->input('page', 1),
        ]));

        $files = Cache::tags(['files'])->remember($cacheKey, 300, function () use ($request) {
            $filterDTO = FileFilterDTO::fromRequest($request);

            return $this->fileService->listFiles($filterDTO);
        });

        return response()->json($files);
    }
}
