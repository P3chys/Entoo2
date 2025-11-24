<?php

namespace Tests\Feature;

use App\Models\SubjectProfile;
use App\Models\UploadedFile;
use App\Models\User;
use App\Services\ElasticsearchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class AdminSubjectTest extends TestCase
{
    use RefreshDatabase;

    private $admin;
    private $user;
    private $elasticsearchMock;

    protected function setUp(): void
    {
        parent::setUp();

        // Create admin and user
        $this->admin = User::factory()->create(['is_admin' => true]);
        $this->user = User::factory()->create(['is_admin' => false]);

        // Mock ElasticsearchService
        $this->elasticsearchMock = Mockery::mock(ElasticsearchService::class);
        $this->app->instance(ElasticsearchService::class, $this->elasticsearchMock);
    }

    public function test_admin_can_list_subjects()
    {
        // Create profiles
        SubjectProfile::create([
            'subject_name' => 'Math',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id
        ]);

        // Create file with different subject
        UploadedFile::factory()->create([
            'subject_name' => 'Physics',
            'user_id' => $this->user->id
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/admin/subjects');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'subjects')
            ->assertJsonFragment(['subject_name' => 'Math', 'has_profile' => true])
            ->assertJsonFragment(['subject_name' => 'Physics', 'has_profile' => false]);
    }

    public function test_non_admin_cannot_list_subjects()
    {
        $response = $this->actingAs($this->user)->getJson('/api/admin/subjects');
        $response->assertStatus(403);
    }

    public function test_admin_can_create_subject_profile()
    {
        $data = [
            'subject_name' => 'Chemistry',
            'description' => 'Basic Chemistry',
            'credits' => 5
        ];

        $response = $this->actingAs($this->admin)->postJson('/api/admin/subjects', $data);

        $response->assertStatus(201)
            ->assertJsonFragment(['subject_name' => 'Chemistry']);

        $this->assertDatabaseHas('subject_profiles', ['subject_name' => 'Chemistry']);
    }

    public function test_admin_can_update_subject_profile()
    {
        $profile = SubjectProfile::create([
            'subject_name' => 'Biology',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id
        ]);

        $data = ['description' => 'Advanced Biology'];

        $response = $this->actingAs($this->admin)->putJson("/api/admin/subjects/{$profile->id}", $data);

        $response->assertStatus(200)
            ->assertJsonFragment(['description' => 'Advanced Biology']);

        $this->assertDatabaseHas('subject_profiles', ['id' => $profile->id, 'description' => 'Advanced Biology']);
    }

    public function test_renaming_subject_updates_files_and_elasticsearch()
    {
        $profile = SubjectProfile::create([
            'subject_name' => 'Old Name',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id
        ]);

        UploadedFile::factory()->create([
            'subject_name' => 'Old Name',
            'user_id' => $this->user->id
        ]);

        // Expect Elasticsearch update
        $this->elasticsearchMock->shouldReceive('updateSubjectName')
            ->once()
            ->with('Old Name', 'New Name')
            ->andReturn(1);

        $response = $this->actingAs($this->admin)->putJson("/api/admin/subjects/{$profile->id}", [
            'subject_name' => 'New Name'
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('subject_profiles', ['subject_name' => 'New Name']);
        $this->assertDatabaseHas('uploaded_files', ['subject_name' => 'New Name']);
        $this->assertDatabaseMissing('uploaded_files', ['subject_name' => 'Old Name']);
    }

    public function test_deleting_subject_removes_profile_files_and_elasticsearch_docs()
    {
        Storage::fake('local');

        $profile = SubjectProfile::create([
            'subject_name' => 'History',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id
        ]);

        $file = UploadedFile::factory()->create([
            'subject_name' => 'History',
            'user_id' => $this->user->id,
            'filepath' => 'files/history.pdf'
        ]);

        Storage::put('files/history.pdf', 'content');

        // Expect Elasticsearch delete
        $this->elasticsearchMock->shouldReceive('deleteDocument')
            ->once()
            ->with($file->id)
            ->andReturn(true);

        $response = $this->actingAs($this->admin)->deleteJson("/api/admin/subjects/{$profile->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('subject_profiles', ['id' => $profile->id]);
        $this->assertDatabaseMissing('uploaded_files', ['id' => $file->id]);
        Storage::assertMissing('files/history.pdf');
    }
}
