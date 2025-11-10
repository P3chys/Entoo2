<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\UploadedFile;
use App\Services\ElasticsearchService;
use Illuminate\Support\Facades\DB;
use Elastic\Elasticsearch\ClientBuilder;

class SyncDatabaseFromElasticsearch extends Command
{
    protected $signature = 'sync:db-from-elasticsearch
                            {--user=1 : Default user ID for files without user_id}
                            {--dry-run : Run without making changes}
                            {--batch-size=100 : Number of records to process at once}';

    protected $description = 'Restore database records from Elasticsearch index';

    private ElasticsearchService $elasticsearchService;
    private $stats = [
        'total' => 0,
        'created' => 0,
        'skipped' => 0,
        'failed' => 0,
    ];

    public function __construct(ElasticsearchService $elasticsearchService)
    {
        parent::__construct();
        $this->elasticsearchService = $elasticsearchService;
    }

    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $defaultUserId = (int) $this->option('user');
        $batchSize = (int) $this->option('batch-size');

        // Validate default user
        $defaultUser = User::find($defaultUserId);
        if (!$defaultUser) {
            $this->error("User with ID {$defaultUserId} not found!");
            return 1;
        }

        $this->info("========================================");
        $this->info("Sync Database from Elasticsearch");
        $this->info("========================================");
        $this->info("Default User: {$defaultUser->name} (ID: {$defaultUser->id})");
        $this->info("Dry Run: " . ($dryRun ? 'YES' : 'NO'));
        $this->info("========================================\n");

        // Get all documents from Elasticsearch
        $this->info("Fetching documents from Elasticsearch...");
        $documents = $this->getAllDocuments($batchSize);
        $this->stats['total'] = count($documents);

        $this->info("Found {$this->stats['total']} documents in Elasticsearch\n");

        if ($this->stats['total'] === 0) {
            $this->warn("No documents found in Elasticsearch.");
            return 0;
        }

        if (!$dryRun && !$this->confirm('Do you want to proceed with syncing?', true)) {
            $this->info("Sync cancelled.");
            return 0;
        }

        // Process documents
        $progressBar = $this->output->createProgressBar($this->stats['total']);
        $progressBar->start();

        foreach ($documents as $doc) {
            $this->processDocument($doc, $defaultUserId, $dryRun);
            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        // Display summary
        $this->displaySummary();

        return 0;
    }

    private function getAllDocuments(int $batchSize): array
    {
        $allDocuments = [];

        try {
            // Create Elasticsearch client
            $client = ClientBuilder::create()
                ->setHosts([config('services.elasticsearch.host', 'http://elasticsearch:9200')])
                ->build();

            // Use search with from/size pagination
            $from = 0;

            while (true) {
                $params = [
                    'index' => 'entoo_documents',
                    'size' => $batchSize,
                    'from' => $from,
                    'body' => [
                        'query' => [
                            'match_all' => (object)[]
                        ]
                    ]
                ];

                $response = $client->search($params);

                $hits = $response['hits']['hits'] ?? [];

                if (empty($hits)) {
                    break;
                }

                foreach ($hits as $hit) {
                    $allDocuments[] = $hit['_source'];
                }

                $from += $batchSize;

                // Elasticsearch has a default limit of 10000 for from+size
                if ($from >= 10000 || count($hits) < $batchSize) {
                    break;
                }
            }

        } catch (\Exception $e) {
            $this->error("Failed to fetch documents: {$e->getMessage()}");
        }

        return $allDocuments;
    }

    private function processDocument(array $doc, int $defaultUserId, bool $dryRun): void
    {
        try {
            $fileId = $doc['file_id'] ?? null;

            if (!$fileId) {
                $this->stats['failed']++;
                return;
            }

            // Check if record already exists
            if (UploadedFile::find($fileId)) {
                $this->stats['skipped']++;
                return;
            }

            if ($dryRun) {
                $this->stats['created']++;
                return;
            }

            // Use default user if the original user doesn't exist
            $userId = $doc['user_id'] ?? $defaultUserId;
            if (!User::find($userId)) {
                $userId = $defaultUserId;
            }

            // Create database record
            DB::table('uploaded_files')->insert([
                'id' => $fileId,
                'user_id' => $userId,
                'filename' => $doc['filename'] ?? 'unknown',
                'original_filename' => $doc['original_filename'] ?? 'unknown',
                'filepath' => $doc['filepath'] ?? '',
                'subject_name' => $doc['subject_name'] ?? 'Unknown',
                'category' => $doc['category'] ?? 'Materialy',
                'file_size' => $doc['file_size'] ?? 0,
                'file_extension' => $doc['file_extension'] ?? 'unknown',
                'processing_status' => 'completed',
                'processing_error' => null,
                'created_at' => $doc['created_at'] ?? now(),
                'updated_at' => now(),
            ]);

            $this->stats['created']++;

        } catch (\Exception $e) {
            $this->stats['failed']++;
            $this->warn("  Failed to sync file_id {$fileId}: {$e->getMessage()}");
        }
    }

    private function displaySummary(): void
    {
        $this->info("========================================");
        $this->info("Sync Summary");
        $this->info("========================================");
        $this->info("Total documents:  {$this->stats['total']}");
        $this->info("Created:          {$this->stats['created']}");
        $this->info("Skipped:          {$this->stats['skipped']}");
        $this->info("Failed:           {$this->stats['failed']}");
        $this->info("========================================");
    }
}
