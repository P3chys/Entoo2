<?php

namespace App\Services;

use Elastic\Elasticsearch\Client;
use Elastic\Elasticsearch\ClientBuilder;
use Exception;
use Illuminate\Support\Facades\Log;

class ElasticsearchService
{
    private Client $client;

    private string $indexName;

    public function __construct()
    {
        $hosts = [
            config('services.elasticsearch.host', 'http://elasticsearch:9200'),
        ];

        $this->client = ClientBuilder::create()
            ->setHosts($hosts)
            ->build();

        $this->indexName = config('services.elasticsearch.index', 'entoo_documents');
    }

    /**
     * Create or update the index with proper mappings
     */
    public function createIndex(): bool
    {
        try {
            // Check if index already exists
            if ($this->client->indices()->exists(['index' => $this->indexName])->asBool()) {
                Log::info("Elasticsearch index '{$this->indexName}' already exists");

                return true;
            }

            $params = [
                'index' => $this->indexName,
                'body' => [
                    'settings' => [
                        'number_of_shards' => 1,
                        'number_of_replicas' => 0,
                        'analysis' => [
                            'analyzer' => [
                                'custom_analyzer' => [
                                    'type' => 'custom',
                                    'tokenizer' => 'standard',
                                    'filter' => ['lowercase', 'asciifolding'],
                                ],
                                'edge_ngram_analyzer' => [
                                    'type' => 'custom',
                                    'tokenizer' => 'standard',
                                    'filter' => ['lowercase', 'asciifolding', 'edge_ngram_filter'],
                                ],
                            ],
                            'filter' => [
                                'edge_ngram_filter' => [
                                    'type' => 'edge_ngram',
                                    'min_gram' => 3,
                                    'max_gram' => 15,
                                ],
                            ],
                        ],
                    ],
                    'mappings' => [
                        'properties' => [
                            'file_id' => ['type' => 'long'],
                            'user_id' => ['type' => 'long'],
                            'filename' => [
                                'type' => 'text',
                                'analyzer' => 'edge_ngram_analyzer',
                                'search_analyzer' => 'custom_analyzer',
                                'fields' => [
                                    'keyword' => ['type' => 'keyword'],
                                ],
                            ],
                            'original_filename' => [
                                'type' => 'text',
                                'analyzer' => 'edge_ngram_analyzer',
                                'search_analyzer' => 'custom_analyzer',
                            ],
                            'filepath' => ['type' => 'keyword'],
                            'subject_name' => [
                                'type' => 'text',
                                'analyzer' => 'custom_analyzer',
                                'fields' => [
                                    'keyword' => ['type' => 'keyword'],
                                ],
                            ],
                            'category' => ['type' => 'keyword'],
                            'file_extension' => ['type' => 'keyword'],
                            'file_size' => ['type' => 'long'],
                            'content' => [
                                'type' => 'text',
                                'analyzer' => 'custom_analyzer',
                            ],
                            'created_at' => ['type' => 'date'],
                            'updated_at' => ['type' => 'date'],
                        ],
                    ],
                ],
            ];

            $response = $this->client->indices()->create($params);
            Log::info("Elasticsearch index '{$this->indexName}' created successfully");

            return $response['acknowledged'] ?? false;
        } catch (Exception $e) {
            Log::error('Failed to create Elasticsearch index', ['error' => $e->getMessage()]);
            throw new Exception("Failed to create Elasticsearch index: {$e->getMessage()}");
        }
    }

    /**
     * Index a document
     */
    public function indexDocument(array $document): bool
    {
        try {
            $params = [
                'index' => $this->indexName,
                'id' => $document['file_id'],
                'body' => $document,
                'refresh' => 'true', // Force immediate refresh to make document visible
            ];

            $response = $this->client->index($params);

            return $response['result'] === 'created' || $response['result'] === 'updated';
        } catch (Exception $e) {
            Log::error('Failed to index document', [
                'file_id' => $document['file_id'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Search documents with fuzzy matching
     */
    public function search(string $query, ?int $userId = null, array $filters = [], int $size = 20): array
    {
        try {
            $must = [];

            // Only filter by user_id if provided (for multi-tenant scenarios)
            if ($userId !== null) {
                $must[] = ['term' => ['user_id' => $userId]];
            }

            if (! empty($query)) {
                $must[] = [
                    'multi_match' => [
                        'query' => $query,
                        'fields' => [
                            'filename^3',
                            'original_filename^2',
                            'subject_name^2',
                            'content',
                        ],
                        'fuzziness' => 'AUTO',
                        'operator' => 'or',
                    ],
                ];
            }

            // Add filters
            if (! empty($filters['subject_name'])) {
                $must[] = ['term' => ['subject_name.keyword' => $filters['subject_name']]];
            }

            if (! empty($filters['category'])) {
                $must[] = ['term' => ['category' => $filters['category']]];
            }

            if (! empty($filters['file_extension'])) {
                $must[] = ['term' => ['file_extension' => $filters['file_extension']]];
            }

            $params = [
                'index' => $this->indexName,
                'body' => [
                    'query' => [
                        'bool' => [
                            'must' => $must,
                        ],
                    ],
                    'size' => $size,
                    'sort' => [
                        ['_score' => ['order' => 'desc']],
                        ['created_at' => ['order' => 'desc']],
                    ],
                    'highlight' => [
                        'max_analyzed_offset' => 10000000, // 10MB limit for highlighting
                        'fields' => [
                            'filename' => new \stdClass,
                            'content' => [
                                'fragment_size' => 150,
                                'number_of_fragments' => 3,
                            ],
                        ],
                    ],
                ],
            ];

            $response = $this->client->search($params);

            return $this->formatSearchResults($response->asArray());
        } catch (Exception $e) {
            Log::error('Elasticsearch search failed', [
                'query' => $query,
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);

            return [
                'total' => 0,
                'results' => [],
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Format search results
     */
    private function formatSearchResults(array $response): array
    {
        $hits = $response['hits']['hits'] ?? [];
        $total = $response['hits']['total']['value'] ?? 0;

        $results = array_map(function ($hit) {
            return [
                'file_id' => $hit['_id'],
                'score' => $hit['_score'],
                'source' => $hit['_source'],
                'highlight' => $hit['highlight'] ?? [],
            ];
        }, $hits);

        return [
            'total' => $total,
            'results' => $results,
        ];
    }

    /**
     * Delete a document from the index
     */
    public function deleteDocument(int $fileId): bool
    {
        try {
            $params = [
                'index' => $this->indexName,
                'id' => $fileId,
                'refresh' => 'true', // Force immediate refresh to make deletion visible
            ];

            $response = $this->client->delete($params);

            return $response['result'] === 'deleted';
        } catch (Exception $e) {
            Log::error('Failed to delete document from Elasticsearch', [
                'file_id' => $fileId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Bulk index documents
     */
    public function bulkIndex(array $documents): array
    {
        try {
            $params = ['body' => []];

            foreach ($documents as $document) {
                $params['body'][] = [
                    'index' => [
                        '_index' => $this->indexName,
                        '_id' => $document['file_id'],
                    ],
                ];
                $params['body'][] = $document;
            }

            $response = $this->client->bulk($params);

            $indexed = 0;
            $failed = 0;

            foreach ($response['items'] as $item) {
                if (isset($item['index']['result']) && in_array($item['index']['result'], ['created', 'updated'])) {
                    $indexed++;
                } else {
                    $failed++;
                }
            }

            return [
                'indexed' => $indexed,
                'failed' => $failed,
                'total' => count($documents),
            ];
        } catch (Exception $e) {
            Log::error('Bulk indexing failed', ['error' => $e->getMessage()]);

            return [
                'indexed' => 0,
                'failed' => count($documents),
                'total' => count($documents),
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get document by ID
     */
    public function getDocument(int $fileId): ?array
    {
        try {
            $params = [
                'index' => $this->indexName,
                'id' => $fileId,
            ];

            $response = $this->client->get($params);

            return $response['_source'] ?? null;
        } catch (Exception $e) {
            Log::warning('Document not found in Elasticsearch', [
                'file_id' => $fileId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Get index statistics
     */
    public function getStats(): array
    {
        try {
            $response = $this->client->indices()->stats(['index' => $this->indexName]);

            $indexStats = $response['indices'][$this->indexName] ?? [];

            return [
                'document_count' => $indexStats['total']['docs']['count'] ?? 0,
                'deleted_count' => $indexStats['total']['docs']['deleted'] ?? 0,
                'size_in_bytes' => $indexStats['total']['store']['size_in_bytes'] ?? 0,
            ];
        } catch (Exception $e) {
            Log::error('Failed to get index stats', ['error' => $e->getMessage()]);

            return [
                'document_count' => 0,
                'deleted_count' => 0,
                'size_in_bytes' => 0,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Check Elasticsearch connection
     */
    public function ping(): bool
    {
        try {
            return $this->client->ping()->asBool();
        } catch (Exception $e) {
            Log::error('Elasticsearch ping failed', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Get Elasticsearch cluster info
     */
    public function getInfo(): array
    {
        try {
            return $this->client->info()->asArray();
        } catch (Exception $e) {
            Log::error('Failed to get Elasticsearch info', ['error' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * Check if index exists
     */
    public function indexExists(): bool
    {
        try {
            return $this->client->indices()->exists(['index' => $this->indexName])->asBool();
        } catch (Exception $e) {
            Log::error('Failed to check if index exists', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Get detailed index statistics
     */
    public function getIndexStats(): array
    {
        try {
            return $this->client->indices()->stats(['index' => $this->indexName])->asArray();
        } catch (Exception $e) {
            Log::error('Failed to get index stats', ['error' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * Delete the entire index
     */
    public function deleteIndex(): bool
    {
        try {
            $response = $this->client->indices()->delete(['index' => $this->indexName]);
            Log::info("Elasticsearch index '{$this->indexName}' deleted");

            return $response['acknowledged'] ?? false;
        } catch (Exception $e) {
            Log::error('Failed to delete Elasticsearch index', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Get all subjects with file counts using Elasticsearch aggregation
     * Much faster than PostgreSQL for this operation
     */
    public function getSubjectsWithCounts(): array
    {
        try {
            $params = [
                'index' => $this->indexName,
                'size' => 0, // We don't need documents, just aggregations
                'body' => [
                    'aggs' => [
                        'subjects' => [
                            'terms' => [
                                'field' => 'subject_name.keyword',
                                'size' => 1000, // Support up to 1000 subjects
                                'order' => ['_key' => 'asc'], // Sort alphabetically
                            ],
                        ],
                    ],
                ],
            ];

            $response = $this->client->search($params);

            // Get all subject profiles with codes and semesters
            $profiles = \DB::table('subject_profiles')
                ->select('subject_name', 'course_code', 'semester')
                ->get()
                ->keyBy('subject_name');

            $subjects = [];
            foreach ($response['aggregations']['subjects']['buckets'] ?? [] as $bucket) {
                $subjectName = $bucket['key'];
                $profile = $profiles->get($subjectName);

                $subjects[] = [
                    'subject_name' => $subjectName,
                    'file_count' => $bucket['doc_count'],
                    'has_profile' => $profile !== null,
                    'code' => $profile ? $profile->course_code : null,
                    'semester' => $profile ? $profile->semester : null,
                ];
            }

            return $subjects;
        } catch (Exception $e) {
            Log::error('Failed to get subjects from Elasticsearch', ['error' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * Get files for a specific subject from Elasticsearch
     * Much faster than PostgreSQL + ORM
     */
    public function getFilesBySubject(string $subjectName, int $size = 1000): array
    {
        try {
            $params = [
                'index' => $this->indexName,
                'size' => $size,
                'body' => [
                    'query' => [
                        'term' => [
                            'subject_name.keyword' => $subjectName,
                        ],
                    ],
                    'sort' => [
                        ['created_at' => ['order' => 'desc']],
                    ],
                ],
            ];

            $response = $this->client->search($params);

            $files = [];
            foreach ($response['hits']['hits'] ?? [] as $hit) {
                $files[] = $hit['_source'];
            }

            return $files;
        } catch (Exception $e) {
            Log::error('Failed to get files by subject from Elasticsearch', [
                'subject' => $subjectName,
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * Get comprehensive stats directly from Elasticsearch
     * Faster than multiple database queries
     */
    public function getComprehensiveStats(): array
    {
        try {
            $params = [
                'index' => $this->indexName,
                'size' => 0,
                'body' => [
                    'aggs' => [
                        'total_subjects' => [
                            'cardinality' => [
                                'field' => 'subject_name.keyword',
                            ],
                        ],
                        'total_storage' => [
                            'sum' => [
                                'field' => 'file_size',
                            ],
                        ],
                        'by_category' => [
                            'terms' => [
                                'field' => 'category.keyword',
                                'size' => 10,
                            ],
                        ],
                        'by_extension' => [
                            'terms' => [
                                'field' => 'file_extension.keyword',
                                'size' => 10,
                            ],
                        ],
                    ],
                ],
            ];

            $response = $this->client->search($params);
            $aggs = $response['aggregations'] ?? [];

            return [
                'total_files' => $response['hits']['total']['value'] ?? 0,
                'total_subjects' => $aggs['total_subjects']['value'] ?? 0,
                'total_storage_bytes' => $aggs['total_storage']['value'] ?? 0,
                'files_by_category' => array_map(function ($bucket) {
                    return [
                        'category' => $bucket['key'],
                        'count' => $bucket['doc_count'],
                    ];
                }, $aggs['by_category']['buckets'] ?? []),
                'files_by_extension' => array_map(function ($bucket) {
                    return [
                        'file_extension' => $bucket['key'],
                        'count' => $bucket['doc_count'],
                    ];
                }, $aggs['by_extension']['buckets'] ?? []),
            ];
        } catch (Exception $e) {
            Log::error('Failed to get comprehensive stats from Elasticsearch', ['error' => $e->getMessage()]);

            return [
                'total_files' => 0,
                'total_subjects' => 0,
                'total_storage_bytes' => 0,
                'files_by_category' => [],
                'files_by_extension' => [],
            ];
        }
    }

    /**
     * Update subject name for all matching documents
     *
     * @return int Number of updated documents
     */
    public function updateSubjectName(string $oldName, string $newName): int
    {
        try {
            $params = [
                'index' => $this->indexName,
                'body' => [
                    'script' => [
                        'source' => 'ctx._source.subject_name = params.newName',
                        'params' => ['newName' => $newName],
                    ],
                    'query' => [
                        'term' => [
                            'subject_name.keyword' => $oldName,
                        ],
                    ],
                ],
            ];

            $response = $this->client->updateByQuery($params);

            return $response['updated'] ?? 0;
        } catch (Exception $e) {
            Log::error('Failed to update subject name in Elasticsearch', [
                'old_name' => $oldName,
                'new_name' => $newName,
                'error' => $e->getMessage(),
            ]);

            return 0;
        }
    }
}
