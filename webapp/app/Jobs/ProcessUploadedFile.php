<?php

namespace App\Jobs;

use App\Models\UploadedFile;
use App\Services\DocumentParserService;
use App\Services\ElasticsearchService;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessUploadedFile implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 300; // 5 minutes

    /**
     * The uploaded file to process
     *
     * @var UploadedFile
     */
    protected $uploadedFile;

    /**
     * Create a new job instance.
     */
    public function __construct(UploadedFile $uploadedFile)
    {
        $this->uploadedFile = $uploadedFile;
    }

    /**
     * Execute the job.
     */
    public function handle(
        DocumentParserService $parserService,
        ElasticsearchService $elasticsearchService
    ): void {
        try {
            // Update status to processing
            $this->uploadedFile->update([
                'processing_status' => 'processing',
            ]);

            // Get file path
            $fullPath = Storage::path($this->uploadedFile->filepath);

            // Parse document content
            $content = '';
            try {
                $content = $parserService->extractText(
                    $fullPath,
                    $this->uploadedFile->file_extension
                );
            } catch (Exception $e) {
                // If parsing fails, log but continue with empty content
                Log::warning('Failed to parse file content', [
                    'file_id' => $this->uploadedFile->id,
                    'file' => $this->uploadedFile->filename,
                    'error' => $e->getMessage(),
                ]);
            }

            // Index in Elasticsearch
            try {
                $elasticsearchService->indexDocument([
                    'file_id' => $this->uploadedFile->id,
                    'user_id' => $this->uploadedFile->user_id,
                    'filename' => $this->uploadedFile->filename,
                    'original_filename' => $this->uploadedFile->original_filename,
                    'filepath' => $this->uploadedFile->filepath,
                    'subject_name' => $this->uploadedFile->subject_name,
                    'category' => $this->uploadedFile->category,
                    'file_extension' => $this->uploadedFile->file_extension,
                    'file_size' => $this->uploadedFile->file_size,
                    'content' => $content,
                    'created_at' => $this->uploadedFile->created_at->toIso8601String(),
                    'updated_at' => $this->uploadedFile->updated_at->toIso8601String(),
                ]);
            } catch (Exception $e) {
                Log::error('Failed to index file in Elasticsearch', [
                    'file_id' => $this->uploadedFile->id,
                    'error' => $e->getMessage(),
                ]);
                throw $e; // Re-throw to trigger job retry
            }

            // Update status to completed
            $this->uploadedFile->update([
                'processing_status' => 'completed',
                'processing_error' => null,
                'processed_at' => now(),
            ]);

            // Clear all relevant caches
            $this->clearFileRelatedCaches();

            Log::info('File processed successfully', [
                'file_id' => $this->uploadedFile->id,
                'filename' => $this->uploadedFile->filename,
            ]);

        } catch (Exception $e) {
            // Update status to failed
            $this->uploadedFile->update([
                'processing_status' => 'failed',
                'processing_error' => $e->getMessage(),
            ]);

            Log::error('File processing failed', [
                'file_id' => $this->uploadedFile->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Re-throw to trigger job retry
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(Exception $exception): void
    {
        // Update status to failed after all retries exhausted
        $this->uploadedFile->update([
            'processing_status' => 'failed',
            'processing_error' => 'Processing failed after '.$this->tries.' attempts: '.$exception->getMessage(),
        ]);

        Log::error('File processing permanently failed', [
            'file_id' => $this->uploadedFile->id,
            'error' => $exception->getMessage(),
        ]);
    }

    /**
     * Clear all file-related caches
     */
    private function clearFileRelatedCaches(): void
    {
        Cache::tags(['files'])->flush();
        Cache::tags(['subjects'])->flush();
        // Clear simple cache keys for better Octane performance
        Cache::forget('system:stats:comprehensive');
        Cache::forget('subjects:with_counts');
        Cache::forget('subjects:list');
    }
}
