<?php

namespace Tests\Feature;

use App\Models\UploadedFile;
use App\Models\User;
use Illuminate\Http\UploadedFile as HttpUploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

use Illuminate\Foundation\Testing\RefreshDatabase;

class FileAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    protected array $createdUsers = [];
    protected array $createdFiles = [];

    protected function tearDown(): void
    {
        // Clean up test data
        foreach ($this->createdFiles as $file) {
            $file->delete();
        }
        foreach ($this->createdUsers as $user) {
            $user->tokens()->delete();
            $user->delete();
        }

        parent::tearDown();
    }

    protected function createTestUser(array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $this->createdUsers[] = $user;
        return $user;
    }

    protected function createTestFile(array $attributes = []): UploadedFile
    {
        $file = UploadedFile::factory()->create($attributes);
        $this->createdFiles[] = $file;
        return $file;
    }

    /**
     * Test authenticated user can download any file (sharing platform)
     */
    public function test_authenticated_user_can_download_file(): void
    {
        Storage::fake('local');

        $owner = $this->createTestUser();
        $otherUser = $this->createTestUser();

        // Create a test file
        $testFile = HttpUploadedFile::fake()->create('document.pdf', 100);
        Storage::put('test/document.pdf', $testFile->getContent());

        $file = $this->createTestFile([
            'user_id' => $owner->id,
            'filepath' => 'test/document.pdf',
            'original_filename' => 'document.pdf',
        ]);

        // Another user should be able to download (sharing platform)
        $response = $this->actingAs($otherUser, 'sanctum')
            ->getJson("/api/files/{$file->id}/download");

        $response->assertStatus(200);
    }

    /**
     * Test unauthenticated user cannot download file
     */
    public function test_unauthenticated_user_cannot_download_file(): void
    {
        $file = $this->createTestFile();

        $response = $this->getJson("/api/files/{$file->id}/download");

        $response->assertStatus(401);
    }

    /**
     * Test only file owner can view file details
     */
    public function test_only_owner_can_view_file_details(): void
    {
        $owner = $this->createTestUser();
        $otherUser = $this->createTestUser();

        $file = $this->createTestFile([
            'user_id' => $owner->id,
        ]);

        // Owner can view
        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/files/{$file->id}");

        $response->assertStatus(200)
            ->assertJson([
                'file' => [
                    'id' => $file->id,
                ]
            ]);

        // Other user cannot view
        $response = $this->actingAs($otherUser, 'sanctum')
            ->getJson("/api/files/{$file->id}");

        $response->assertStatus(403);
    }

    /**
     * Test only file owner can view processing status
     */
    public function test_only_owner_can_view_processing_status(): void
    {
        $owner = $this->createTestUser();
        $otherUser = $this->createTestUser();

        $file = $this->createTestFile([
            'user_id' => $owner->id,
            'processing_status' => 'completed',
        ]);

        // Owner can view status
        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/files/{$file->id}/status");

        $response->assertStatus(200)
            ->assertJson([
                'processing_status' => 'completed',
            ]);

        // Other user cannot view status
        $response = $this->actingAs($otherUser, 'sanctum')
            ->getJson("/api/files/{$file->id}/status");

        $response->assertStatus(403);
    }

    /**
     * Test only file owner can delete file
     */
    public function test_only_owner_can_delete_file(): void
    {
        Storage::fake('local');

        $owner = $this->createTestUser();
        $otherUser = $this->createTestUser();

        $file = $this->createTestFile([
            'user_id' => $owner->id,
            'filepath' => 'test/document.pdf',
        ]);

        // Other user cannot delete
        $response = $this->actingAs($otherUser, 'sanctum')
            ->deleteJson("/api/files/{$file->id}");

        $response->assertStatus(403);

        // File should still exist
        $this->assertDatabaseHas('uploaded_files', [
            'id' => $file->id,
        ]);

        // Owner can delete
        $response = $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/files/{$file->id}");

        $response->assertStatus(200);

        // File should be deleted
        $this->assertDatabaseMissing('uploaded_files', [
            'id' => $file->id,
        ]);
    }

    /**
     * Test admin can delete any file
     */
    public function test_admin_can_delete_any_file(): void
    {
        Storage::fake('local');

        $admin = $this->createTestUser(['is_admin' => true]);
        $otherUser = $this->createTestUser();

        $file = $this->createTestFile([
            'user_id' => $otherUser->id,
        ]);

        // Admin can delete
        $response = $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/files/{$file->id}");

        $response->assertStatus(200);

        // File should be deleted
        $this->assertDatabaseMissing('uploaded_files', [
            'id' => $file->id,
        ]);
    }

    /**
     * Test unauthenticated user cannot delete file
     */
    public function test_unauthenticated_user_cannot_delete_file(): void
    {
        $file = $this->createTestFile();

        $response = $this->deleteJson("/api/files/{$file->id}");

        $response->assertStatus(401);

        // File should still exist
        $this->assertDatabaseHas('uploaded_files', [
            'id' => $file->id,
        ]);
    }

    /**
     * Test authorization on non-existent file
     */
    public function test_authorization_on_non_existent_file(): void
    {
        $user = $this->createTestUser();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/files/99999');

        $response->assertStatus(404);
    }

    /**
     * Test multiple users with different files
     */
    public function test_multiple_users_with_different_files(): void
    {
        $user1 = $this->createTestUser();
        $user2 = $this->createTestUser();

        $file1 = $this->createTestFile(['user_id' => $user1->id]);
        $file2 = $this->createTestFile(['user_id' => $user2->id]);

        // User1 can view their own file
        $this->actingAs($user1, 'sanctum')
            ->getJson("/api/files/{$file1->id}")
            ->assertStatus(200);

        // User1 cannot view user2's file
        $this->actingAs($user1, 'sanctum')
            ->getJson("/api/files/{$file2->id}")
            ->assertStatus(403);

        // User2 can view their own file
        $this->actingAs($user2, 'sanctum')
            ->getJson("/api/files/{$file2->id}")
            ->assertStatus(200);

        // User2 cannot view user1's file
        $this->actingAs($user2, 'sanctum')
            ->getJson("/api/files/{$file1->id}")
            ->assertStatus(403);
    }

    /**
     * Test file download returns correct file
     */
    public function test_file_download_returns_correct_file(): void
    {
        Storage::fake('local');

        $user = $this->createTestUser();

        // Create a test file
        $content = 'Test file content';
        Storage::put('test/document.txt', $content);

        $file = $this->createTestFile([
            'user_id' => $user->id,
            'filepath' => 'test/document.txt',
            'original_filename' => 'document.txt',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/files/{$file->id}/download");

        $response->assertStatus(200)
            ->assertDownload('document.txt');
    }

    /**
     * Test file download when file doesn't exist on disk
     */
    public function test_file_download_when_file_missing_on_disk(): void
    {
        Storage::fake('local');

        $user = $this->createTestUser();

        $file = $this->createTestFile([
            'user_id' => $user->id,
            'filepath' => 'nonexistent/file.pdf',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/files/{$file->id}/download");

        $response->assertStatus(404)
            ->assertJson([
                'message' => 'File not found on disk'
            ]);
    }
}
