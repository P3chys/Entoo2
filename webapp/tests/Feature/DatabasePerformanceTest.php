<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\SubjectProfile;
use App\Models\UploadedFile;
use App\Models\FavoriteSubject;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DatabasePerformanceTest extends TestCase
{
    protected User $user;
    protected array $testSubjects = [
        'Biology', 'Chemistry', 'Computer Science', 'Mathematics', 'Physics',
        'Test Subject', 'Subject_0', 'Subject_1', 'Subject_2', 'Subject_3', 'Subject_4',
        'Subject_5', 'Subject_6', 'Subject_7', 'Subject_8', 'Subject_9',
        'Subject_10', 'Subject_11', 'Subject_12', 'Subject_13', 'Subject_14',
        'Subject_15', 'Subject_16', 'Subject_17', 'Subject_18', 'Subject_19',
        'Subject_20', 'Subject_21', 'Subject_22', 'Subject_23', 'Subject_24',
        'Subject_25', 'Subject_26', 'Subject_27', 'Subject_28', 'Subject_29',
        'Subject_30', 'Subject_31', 'Subject_32', 'Subject_33', 'Subject_34',
        'Subject_35', 'Subject_36', 'Subject_37', 'Subject_38', 'Subject_39',
        'Subject_40', 'Subject_41', 'Subject_42', 'Subject_43', 'Subject_44',
        'Subject_45', 'Subject_46', 'Subject_47', 'Subject_48', 'Subject_49',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        // Use existing user or create one
        $this->user = User::firstOrCreate(
            ['email' => 'test-perf@example.com'],
            [
                'name' => 'Test Performance',
                'password' => bcrypt('password'),
            ]
        );
    }

    protected function tearDown(): void
    {
        // Clean up test data created during tests
        UploadedFile::whereIn('subject_name', $this->testSubjects)->delete();
        FavoriteSubject::whereIn('subject_name', $this->testSubjects)->delete();
        SubjectProfile::whereIn('subject_name', $this->testSubjects)->delete();

        parent::tearDown();
    }

    /**
     * Test that indexes exist on uploaded_files table
     */
    public function test_uploaded_files_has_required_indexes(): void
    {
        // Get all indexes on uploaded_files table
        $indexes = DB::select("
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'uploaded_files'
        ");

        $indexNames = collect($indexes)->pluck('indexname')->toArray();

        // Check for required indexes
        $this->assertContains('uploaded_files_subject_name_index', $indexNames,
            'Missing index on subject_name');
        $this->assertContains('uploaded_files_category_index', $indexNames,
            'Missing index on category');
        $this->assertContains('uploaded_files_subject_name_category_index', $indexNames,
            'Missing composite index on (subject_name, category)');
    }

    /**
     * Test that indexes exist on favorite_subjects table
     */
    public function test_favorite_subjects_has_required_indexes(): void
    {
        // Get all indexes on favorite_subjects table
        $indexes = DB::select("
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'favorite_subjects'
        ");

        $indexNames = collect($indexes)->pluck('indexname')->toArray();

        // Check for required indexes
        $this->assertContains('favorite_subjects_user_id_index', $indexNames,
            'Missing index on user_id');
        $this->assertContains('idx_favorite_subjects_subject_name', $indexNames,
            'Missing index on subject_name');
        $this->assertContains('favorite_subjects_user_id_subject_name_unique', $indexNames,
            'Missing unique index on (user_id, subject_name)');
    }

    /**
     * Test that SubjectProfile N+1 query issue is fixed
     * This test ensures that when fetching multiple profiles, we don't execute
     * a separate query for each profile's file count.
     */
    public function test_subject_profile_file_count_no_n_plus_1_queries(): void
    {
        // Create test data: 5 subjects with specific file counts
        $subjectsWithFileCounts = [
            'Biology' => 2,
            'Chemistry' => 4,
            'Computer Science' => 10,
            'Mathematics' => 6,
            'Physics' => 3,
        ];

        foreach ($subjectsWithFileCounts as $subject => $fileCount) {
            SubjectProfile::create([
                'subject_name' => $subject,
                'description' => "Test subject {$subject}",
                'created_by' => $this->user->id,
                'updated_by' => $this->user->id,
            ]);

            // Create specified number of files for each subject
            for ($i = 0; $i < $fileCount; $i++) {
                UploadedFile::create([
                    'user_id' => $this->user->id,
                    'filename' => "{$subject}_file_{$i}.pdf",
                    'original_filename' => "{$subject}_file_{$i}.pdf",
                    'filepath' => "/path/to/{$subject}/file_{$i}.pdf",
                    'subject_name' => $subject,
                    'category' => 'Materialy',
                    'file_size' => 1024,
                    'file_extension' => 'pdf',
                ]);
            }
        }

        // Enable query logging
        DB::enableQueryLog();

        // Fetch all profiles using the controller's method (with withCount)
        $profiles = SubjectProfile::with(['creator:id,name', 'updater:id,name'])
            ->withCount('uploadedFiles')
            ->orderBy('subject_name')
            ->get();

        // Get the queries executed BEFORE accessing file_count
        $queries = DB::getQueryLog();

        // Count ONLY queries that are standalone count queries on uploaded_files
        // The withCount creates a subquery IN the main query, which is fine
        // We're looking for separate queries like: SELECT count(*) FROM uploaded_files WHERE...
        $separateFileCountQueries = collect($queries)->filter(function ($query) {
            $sql = $query['query'];
            // Check if it's a standalone count query (starts with "select count")
            // and NOT the main query with subquery (which starts with "select "subject_profiles".*")
            return str_contains($sql, 'uploaded_files') &&
                   str_contains(strtolower($sql), 'count(*)') &&
                   !str_contains($sql, 'subject_profiles');
        })->count();

        // With withCount, there should be NO separate count queries - all counts are in subqueries
        $this->assertEquals(0, $separateFileCountQueries,
            'N+1 query detected: Found separate file count queries instead of using withCount subquery');

        // Now verify file counts are correct - this should NOT trigger new queries
        // because withCount already loaded the counts
        $beforeCount = count(DB::getQueryLog());

        $this->assertEquals(2, $profiles->firstWhere('subject_name', 'Biology')->file_count);
        $this->assertEquals(4, $profiles->firstWhere('subject_name', 'Chemistry')->file_count);
        $this->assertEquals(10, $profiles->firstWhere('subject_name', 'Computer Science')->file_count);

        $afterCount = count(DB::getQueryLog());

        // Accessing file_count should not have triggered any new queries
        $this->assertEquals($beforeCount, $afterCount,
            'Accessing file_count triggered new queries - N+1 problem not fully resolved');

        DB::disableQueryLog();
    }

    /**
     * Test that querying uploaded_files by subject_name uses index
     */
    public function test_uploaded_files_query_uses_subject_name_index(): void
    {
        // Create test data
        $subject = 'Test Subject';
        for ($i = 0; $i < 10; $i++) {
            UploadedFile::create([
                'user_id' => $this->user->id,
                'filename' => "file_{$i}.pdf",
                'original_filename' => "file_{$i}.pdf",
                'filepath' => "/path/to/file_{$i}.pdf",
                'subject_name' => $subject,
                'category' => 'Materialy',
                'file_size' => 1024,
                'file_extension' => 'pdf',
            ]);
        }

        // Query with EXPLAIN to check if index is used
        $explain = DB::select("
            EXPLAIN (FORMAT JSON)
            SELECT * FROM uploaded_files
            WHERE subject_name = ?
        ", [$subject]);

        $plan = json_decode($explain[0]->{'QUERY PLAN'}, true);

        // Convert plan to string for easier searching
        $planString = json_encode($plan);

        // Check that the plan mentions an index scan (not sequential scan)
        // In PostgreSQL, we should see "Index Scan" or "Bitmap Index Scan"
        $this->assertTrue(
            str_contains($planString, 'Index Scan') ||
            str_contains($planString, 'Bitmap Index Scan') ||
            str_contains($planString, 'Index Only Scan'),
            'Query is not using an index - performance may be degraded'
        );
    }

    /**
     * Test that querying uploaded_files by subject_name and category uses composite index
     */
    public function test_uploaded_files_query_uses_composite_index(): void
    {
        // Create test data
        $subject = 'Test Subject';
        $category = 'Materialy';

        for ($i = 0; $i < 10; $i++) {
            UploadedFile::create([
                'user_id' => $this->user->id,
                'filename' => "file_{$i}.pdf",
                'original_filename' => "file_{$i}.pdf",
                'filepath' => "/path/to/file_{$i}.pdf",
                'subject_name' => $subject,
                'category' => $category,
                'file_size' => 1024,
                'file_extension' => 'pdf',
            ]);
        }

        // Query with EXPLAIN to check if index is used
        $explain = DB::select("
            EXPLAIN (FORMAT JSON)
            SELECT * FROM uploaded_files
            WHERE subject_name = ? AND category = ?
        ", [$subject, $category]);

        $plan = json_decode($explain[0]->{'QUERY PLAN'}, true);
        $planString = json_encode($plan);

        // Check that the plan uses an index
        $this->assertTrue(
            str_contains($planString, 'Index Scan') ||
            str_contains($planString, 'Bitmap Index Scan') ||
            str_contains($planString, 'Index Only Scan'),
            'Composite query is not using an index - performance may be degraded'
        );
    }

    /**
     * Test that favorite_subjects queries use indexes
     */
    public function test_favorite_subjects_query_uses_indexes(): void
    {
        // Create test data
        $subject = 'Test Subject';
        FavoriteSubject::create([
            'user_id' => $this->user->id,
            'subject_name' => $subject,
        ]);

        // Test query by subject_name
        $explain = DB::select("
            EXPLAIN (FORMAT JSON)
            SELECT * FROM favorite_subjects
            WHERE subject_name = ?
        ", [$subject]);

        $plan = json_decode($explain[0]->{'QUERY PLAN'}, true);
        $planString = json_encode($plan);

        // Check that the plan uses an index
        $this->assertTrue(
            str_contains($planString, 'Index Scan') ||
            str_contains($planString, 'Bitmap Index Scan') ||
            str_contains($planString, 'Index Only Scan'),
            'favorite_subjects query is not using an index - performance may be degraded'
        );
    }

    /**
     * Performance benchmark: Test query speed with indexes
     */
    public function test_query_performance_with_indexes(): void
    {
        // Create a larger dataset for meaningful performance testing
        $subjects = [];
        for ($i = 0; $i < 50; $i++) {
            $subjects[] = "Subject_{$i}";
        }

        foreach ($subjects as $subject) {
            // Create 20 files per subject
            for ($j = 0; $j < 20; $j++) {
                UploadedFile::create([
                    'user_id' => $this->user->id,
                    'filename' => "file_{$j}.pdf",
                    'original_filename' => "file_{$j}.pdf",
                    'filepath' => "/path/to/file_{$j}.pdf",
                    'subject_name' => $subject,
                    'category' => ['Materialy', 'Otazky', 'Prednasky', 'Seminare'][rand(0, 3)],
                    'file_size' => 1024,
                    'file_extension' => 'pdf',
                ]);
            }
        }

        // Benchmark: Query files by subject_name
        $startTime = microtime(true);
        $files = UploadedFile::where('subject_name', 'Subject_25')->get();
        $queryTime = (microtime(true) - $startTime) * 1000; // Convert to ms

        $this->assertCount(20, $files);

        // Query should be fast (under 100ms for this dataset size)
        // This is a reasonable threshold for indexed queries on small to medium datasets
        $this->assertLessThan(100, $queryTime,
            "Query took {$queryTime}ms, which is slower than expected. Indexes may not be working.");
    }
}
