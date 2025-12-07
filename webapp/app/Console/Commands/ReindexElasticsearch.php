<?php

namespace App\Console\Commands;

use App\Models\UploadedFile;
use App\Services\DocumentParserService;
use App\Services\ElasticsearchService;
use Illuminate\Console\Command;

class ReindexElasticsearch extends Command
{
    protected $signature = 'elasticsearch:reindex
                            {--skip-content : Skip re-parsing document content}
                            {--batch-size=100 : Number of documents to process per batch}';

    protected $description = 'Re-index all files from database into Elasticsearch';

    private ElasticsearchService $elasticsearchService;

    private DocumentParserService $parserService;

    private $stats = [
        'total' => 0,
        'indexed' => 0,
        'failed' => 0,
        'errors' => [],
    ];

    private $parseableExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'];

    public function __construct(ElasticsearchService $elasticsearchService, DocumentParserService $parserService)
    {
        parent::__construct();
        $this->elasticsearchService = $elasticsearchService;
        $this->parserService = $parserService;
    }

    public function handle()
    {
        $skipContent = $this->option('skip-content');
        $batchSize = (int) $this->option('batch-size');

        $this->info('========================================');
        $this->info('Elasticsearch Re-indexing');
        $this->info('========================================');
        $this->info('Skip content parsing: '.($skipContent ? 'YES' : 'NO'));
        $this->info("Batch size: {$batchSize}");
        $this->info("========================================\n");

        // Get total count
        $total = UploadedFile::count();
        $this->stats['total'] = $total;

        if ($total === 0) {
            $this->warn('No files found in database.');

            return 0;
        }

        $this->info("Found {$total} files to index\n");

        if (! $this->confirm('Do you want to proceed with re-indexing?', true)) {
            $this->info('Re-indexing cancelled.');

            return 0;
        }

        // Process in batches
        $progressBar = $this->output->createProgressBar($total);
        $progressBar->start();

        UploadedFile::with('user')
            ->chunk($batchSize, function ($files) use ($skipContent, $progressBar) {
                foreach ($files as $file) {
                    $this->indexFile($file, $skipContent);
                    $progressBar->advance();
                }
            });

        $progressBar->finish();
        $this->newLine(2);

        $this->displaySummary();

        return 0;
    }

    private function indexFile(UploadedFile $file, bool $skipContent): void
    {
        try {
            $content = '';

            // Parse content if not skipping (only for parseable file types)
            $fullPath = storage_path("app/{$file->filepath}");
            if (! $skipContent && file_exists($fullPath) && in_array($file->file_extension, $this->parseableExtensions)) {
                try {
                    $content = $this->parserService->extractText($fullPath, $file->file_extension);
                } catch (\Throwable $e) {
                    // Continue with empty content if parsing fails
                    $content = '';
                }
            }

            // Index in Elasticsearch
            $this->elasticsearchService->indexDocument([
                'file_id' => $file->id,
                'user_id' => $file->user_id,
                'filename' => $file->filename,
                'original_filename' => $file->original_filename,
                'filepath' => $file->filepath,
                'subject_name' => $file->subject_name,
                'category' => $file->category,
                'file_extension' => $file->file_extension,
                'file_size' => $file->file_size,
                'content' => $content,
                'created_at' => $file->created_at->toIso8601String(),
                'updated_at' => $file->updated_at->toIso8601String(),
            ]);

            $this->stats['indexed']++;
        } catch (\Exception $e) {
            $this->stats['failed']++;
            $this->stats['errors'][] = [
                'file_id' => $file->id,
                'filename' => $file->original_filename,
                'error' => $e->getMessage(),
            ];
        }
    }

    private function displaySummary(): void
    {
        $this->info('========================================');
        $this->info('Re-indexing Summary');
        $this->info('========================================');
        $this->info("Total Files: {$this->stats['total']}");
        $this->info("Successfully Indexed: {$this->stats['indexed']}");
        $this->info("Failed: {$this->stats['failed']}");
        $this->info("========================================\n");

        if ($this->stats['failed'] > 0) {
            $this->warn('Some files failed to index. Showing first 10 errors:');
            foreach (array_slice($this->stats['errors'], 0, 10) as $error) {
                $this->error("- File #{$error['file_id']} ({$error['filename']}): {$error['error']}");
            }
        }

        if ($this->stats['indexed'] > 0) {
            $this->info("\n✓ Re-indexing completed successfully!");
        }
    }
}
