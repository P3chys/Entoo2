<x-filament-panels::page>
    <div class="space-y-6">
        <!-- Health Status Section -->
        <x-filament::section>
            <x-slot name="heading">
                System Health Status
            </x-slot>
            <x-slot name="headerEnd">
                <x-filament::button
                    wire:click="runHealthCheck"
                    size="sm"
                    icon="heroicon-o-arrow-path"
                >
                    Refresh
                </x-filament::button>
            </x-slot>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- PostgreSQL Status -->
                <div class="flex items-center space-x-3 p-4 rounded-lg border {{ $healthStatus['database']['status'] === 'healthy' ? 'border-success-500 bg-success-50 dark:bg-success-950' : 'border-danger-500 bg-danger-50 dark:bg-danger-950' }}">
                    <div>
                        @if($healthStatus['database']['status'] === 'healthy')
                            <x-heroicon-o-check-circle class="w-8 h-8 text-success-500" />
                        @else
                            <x-heroicon-o-x-circle class="w-8 h-8 text-danger-500" />
                        @endif
                    </div>
                    <div>
                        <div class="font-semibold text-sm">PostgreSQL</div>
                        <div class="text-xs text-gray-600 dark:text-gray-400">{{ $healthStatus['database']['message'] }}</div>
                    </div>
                </div>

                <!-- Redis Status -->
                <div class="flex items-center space-x-3 p-4 rounded-lg border {{ $healthStatus['redis']['status'] === 'healthy' ? 'border-success-500 bg-success-50 dark:bg-success-950' : 'border-danger-500 bg-danger-50 dark:bg-danger-950' }}">
                    <div>
                        @if($healthStatus['redis']['status'] === 'healthy')
                            <x-heroicon-o-check-circle class="w-8 h-8 text-success-500" />
                        @else
                            <x-heroicon-o-x-circle class="w-8 h-8 text-danger-500" />
                        @endif
                    </div>
                    <div>
                        <div class="font-semibold text-sm">Redis</div>
                        <div class="text-xs text-gray-600 dark:text-gray-400">{{ $healthStatus['redis']['message'] }}</div>
                    </div>
                </div>

                <!-- Elasticsearch Status -->
                <div class="flex items-center space-x-3 p-4 rounded-lg border {{ $healthStatus['elasticsearch']['status'] === 'healthy' ? 'border-success-500 bg-success-50 dark:bg-success-950' : ($healthStatus['elasticsearch']['status'] === 'warning' ? 'border-warning-500 bg-warning-50 dark:bg-warning-950' : 'border-danger-500 bg-danger-50 dark:bg-danger-950') }}">
                    <div>
                        @if($healthStatus['elasticsearch']['status'] === 'healthy')
                            <x-heroicon-o-check-circle class="w-8 h-8 text-success-500" />
                        @elseif($healthStatus['elasticsearch']['status'] === 'warning')
                            <x-heroicon-o-exclamation-circle class="w-8 h-8 text-warning-500" />
                        @else
                            <x-heroicon-o-x-circle class="w-8 h-8 text-danger-500" />
                        @endif
                    </div>
                    <div>
                        <div class="font-semibold text-sm">Elasticsearch</div>
                        <div class="text-xs text-gray-600 dark:text-gray-400">{{ $healthStatus['elasticsearch']['message'] }}</div>
                    </div>
                </div>
            </div>
        </x-filament::section>

        <!-- System Statistics Section -->
        <x-filament::section>
            <x-slot name="heading">
                System Statistics
            </x-slot>
            <x-slot name="headerEnd">
                <x-filament::button
                    wire:click="refreshStats"
                    size="sm"
                    icon="heroicon-o-arrow-path"
                >
                    Refresh
                </x-filament::button>
            </x-slot>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <!-- Users -->
                <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">{{ number_format($systemStats['users']) }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
                </div>

                <!-- Files -->
                <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">{{ number_format($systemStats['files']) }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Total Files</div>
                </div>

                <!-- Subjects -->
                <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">{{ number_format($systemStats['subjects']) }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Subjects</div>
                </div>

                <!-- Favorites -->
                <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">{{ number_format($systemStats['favorites']) }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Favorites</div>
                </div>

                <!-- Total Storage -->
                <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">{{ $systemStats['total_size'] }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Total Storage</div>
                </div>

                <!-- ES Docs -->
                <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">{{ is_numeric($systemStats['es_docs']) ? number_format($systemStats['es_docs']) : $systemStats['es_docs'] }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">ES Documents</div>
                </div>

                <!-- ES Size -->
                <div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 col-span-2">
                    <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">{{ $systemStats['es_size'] }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">ES Index Size</div>
                </div>
            </div>
        </x-filament::section>

        <!-- System Actions Section -->
        <x-filament::section>
            <x-slot name="heading">
                System Actions
            </x-slot>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <!-- Clear Cache -->
                <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="flex items-start space-x-3">
                        <x-heroicon-o-trash class="w-6 h-6 text-gray-500 flex-shrink-0 mt-1" />
                        <div class="flex-1">
                            <h3 class="font-semibold text-sm mb-1">Clear Cache</h3>
                            <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">Clear all application caches (Redis, config, routes, views)</p>
                            <x-filament::button
                                wire:click="clearCache"
                                size="sm"
                                color="danger"
                                outlined
                            >
                                Clear Cache
                            </x-filament::button>
                        </div>
                    </div>
                </div>

                <!-- Optimize Application -->
                <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="flex items-start space-x-3">
                        <x-heroicon-o-rocket-launch class="w-6 h-6 text-gray-500 flex-shrink-0 mt-1" />
                        <div class="flex-1">
                            <h3 class="font-semibold text-sm mb-1">Optimize Application</h3>
                            <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">Cache config, routes, and views for better performance</p>
                            <x-filament::button
                                wire:click="optimizeApplication"
                                size="sm"
                                color="success"
                                outlined
                            >
                                Optimize
                            </x-filament::button>
                        </div>
                    </div>
                </div>

                <!-- Initialize Elasticsearch -->
                <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="flex items-start space-x-3">
                        <x-heroicon-o-circle-stack class="w-6 h-6 text-gray-500 flex-shrink-0 mt-1" />
                        <div class="flex-1">
                            <h3 class="font-semibold text-sm mb-1">Initialize Elasticsearch</h3>
                            <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">Create Elasticsearch index with proper mappings</p>
                            <x-filament::button
                                wire:click="initializeElasticsearch"
                                size="sm"
                                color="warning"
                                outlined
                            >
                                Initialize
                            </x-filament::button>
                        </div>
                    </div>
                </div>

                <!-- Reindex Elasticsearch -->
                <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="flex items-start space-x-3">
                        <x-heroicon-o-arrow-path class="w-6 h-6 text-gray-500 flex-shrink-0 mt-1" />
                        <div class="flex-1">
                            <h3 class="font-semibold text-sm mb-1">Reindex Elasticsearch</h3>
                            <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">Rebuild Elasticsearch index from database records</p>
                            <x-filament::button
                                wire:click="reindexElasticsearch"
                                size="sm"
                                color="info"
                                outlined
                            >
                                Reindex
                            </x-filament::button>
                        </div>
                    </div>
                </div>

                <!-- System Stats Command -->
                <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="flex items-start space-x-3">
                        <x-heroicon-o-chart-bar class="w-6 h-6 text-gray-500 flex-shrink-0 mt-1" />
                        <div class="flex-1">
                            <h3 class="font-semibold text-sm mb-1">Detailed Statistics</h3>
                            <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">View detailed system statistics via CLI</p>
                            <div class="text-xs text-gray-500 font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded">
                                php artisan system:stats
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Data Import -->
                <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="flex items-start space-x-3">
                        <x-heroicon-o-arrow-down-tray class="w-6 h-6 text-gray-500 flex-shrink-0 mt-1" />
                        <div class="flex-1">
                            <h3 class="font-semibold text-sm mb-1">Import Files</h3>
                            <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">Import files from storage via CLI</p>
                            <div class="text-xs text-gray-500 font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded">
                                php artisan migrate:remaining-files
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </x-filament::section>

        <!-- CLI Commands Reference -->
        <x-filament::section>
            <x-slot name="heading">
                Available CLI Commands
            </x-slot>

            <div class="space-y-2">
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div class="font-mono text-sm text-primary-600 dark:text-primary-400">php artisan system:health-check</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Check health status of all services</div>
                </div>

                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div class="font-mono text-sm text-primary-600 dark:text-primary-400">php artisan system:stats</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Display detailed system statistics</div>
                </div>

                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div class="font-mono text-sm text-primary-600 dark:text-primary-400">php artisan system:optimize [--clear]</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Optimize the application (optionally clear caches first)</div>
                </div>

                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div class="font-mono text-sm text-primary-600 dark:text-primary-400">php artisan cache:clear-all [--type=TYPE]</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Clear all caches or specific type (redis, config, route, view, all)</div>
                </div>

                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div class="font-mono text-sm text-primary-600 dark:text-primary-400">php artisan elasticsearch:init</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Initialize Elasticsearch index with mappings</div>
                </div>

                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div class="font-mono text-sm text-primary-600 dark:text-primary-400">php artisan elasticsearch:reindex [--skip-content] [--batch-size=100]</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Reindex all files from database into Elasticsearch</div>
                </div>

                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div class="font-mono text-sm text-primary-600 dark:text-primary-400">php artisan migrate:remaining-files [--source=PATH] [--user=ID] [--dry-run] [--limit=N]</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Migrate remaining files from old_entoo directory</div>
                </div>
            </div>
        </x-filament::section>
    </div>
</x-filament-panels::page>
