<?php

namespace App\Console\Commands;

use App\Services\ElasticsearchService;
use Illuminate\Console\Command;

class InitElasticsearch extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'elasticsearch:init';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Initialize Elasticsearch index with proper mappings';

    /**
     * Execute the console command.
     */
    public function handle(ElasticsearchService $elasticsearchService)
    {
        $this->info('Initializing Elasticsearch...');

        // Check connection
        $this->info('Checking Elasticsearch connection...');
        if (!$elasticsearchService->ping()) {
            $this->error('Failed to connect to Elasticsearch!');
            return 1;
        }
        $this->info('✓ Elasticsearch is reachable');

        // Create index
        $this->info('Creating index with mappings...');
        try {
            $result = $elasticsearchService->createIndex();
            if ($result) {
                $this->info('✓ Elasticsearch index created successfully');
            } else {
                $this->info('✓ Elasticsearch index already exists');
            }
        } catch (\Exception $e) {
            $this->error('Failed to create index: ' . $e->getMessage());
            return 1;
        }

        $this->info('✓ Elasticsearch initialization complete!');
        return 0;
    }
}
