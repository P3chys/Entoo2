<?php

namespace App\Services;

use App\Jobs\ProcessUploadedFile;
use App\Models\UploadedFile;
use App\Models\User;
use Exception;
use Illuminate\Http\UploadedFile as HttpUploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileService
{
    private ElasticsearchService $elasticsearchService;

    public function __construct(ElasticsearchService $elasticsearchService)
    {
        $this->elasticsearchService = $elasticsearchService;
    }

    /**
     * Handle file upload process
     */
    public function uploadFile(User $user, HttpUploadedFile $uploadedFile, string $subjectName, string $category): UploadedFile
    {
        $extension = strtolower($uploadedFile->getClientOriginalExtension());
        $filename = Str::uuid() . '.' . $extension;
        $subjectSlug = Str::slug($subjectName);
        $categorySlug = Str::slug($category);

        // Store file
        $path = $uploadedFile->storeAs(
            "uploads/{$subjectSlug}/{$categorySlug}",
            $filename,
            'local'
        );

        // Create database record
        $file = UploadedFile::create([
            'user_id' => $user->id,
            'filename' => $filename,
            'original_filename' => $uploadedFile->getClientOriginalName(),
            'filepath' => $path,
            'subject_name' => $subjectName,
            'category' => $category,
            'file_size' => $uploadedFile->getSize(),
            'file_extension' => $extension,
            'processing_status' => 'pending',
        ]);

        // Dispatch job to process file asynchronously
        ProcessUploadedFile::dispatch($file);

        return $file;
    }

    /**
     * Delete a file and clean up resources
     */
    public function deleteFile(UploadedFile $file): void
    {
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
    }

    /**
     * Get the physical path for file download
     */
    public function getDownloadPath(UploadedFile $file): ?string
    {
        // Optimize: Check if path is absolute first (imported files from old_entoo)
        if (str_starts_with($file->filepath, '/') || preg_match('/^[A-Za-z]:/', $file->filepath)) {
            if (file_exists($file->filepath)) {
                return $file->filepath;
            }
        }

        // Try Laravel storage for relative paths (uploaded files)
        $storagePath = storage_path('app/' . $file->filepath);
        if (file_exists($storagePath)) {
            return $storagePath;
        }

        return null;
    }

    /**
     * Clear all file-related caches
     */
    private function clearFileRelatedCaches(): void
    {
        // Clear all caches tagged with 'files'
        Cache::tags(['files'])->flush();

        // Clear subjects cache (affected by file uploads/deletes)
        Cache::tags(['subjects'])->flush();

        // Clear simple cache keys for better Octane performance
        Cache::forget('system:stats:comprehensive');
        Cache::forget('subjects:with_counts');
        Cache::forget('subjects:list');
    }
}
