<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Notification;
use Illuminate\Auth\Notifications\ResetPassword;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test forgot password request with valid email
     */
    public function test_forgot_password_with_valid_email(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        $response = $this->postJson('/api/forgot-password', [
            'email' => 'test@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Password reset instructions have been sent to your email address.'
            ]);

        // Verify notification was sent
        Notification::assertSentTo($user, ResetPassword::class);
    }

    /**
     * Test forgot password request with invalid email
     */
    public function test_forgot_password_with_invalid_email(): void
    {
        $response = $this->postJson('/api/forgot-password', [
            'email' => 'nonexistent@example.com',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /**
     * Test forgot password request with missing email
     */
    public function test_forgot_password_with_missing_email(): void
    {
        $response = $this->postJson('/api/forgot-password', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /**
     * Test forgot password rate limiting
     */
    public function test_forgot_password_rate_limiting(): void
    {
        $user = User::factory()->create();

        // First 3 requests should succeed
        for ($i = 0; $i < 3; $i++) {
            $response = $this->postJson('/api/forgot-password', [
                'email' => $user->email,
            ]);
            $response->assertStatus(200);
        }

        // 4th request should be rate limited
        $response = $this->postJson('/api/forgot-password', [
            'email' => $user->email,
        ]);

        $response->assertStatus(429); // Too Many Requests
    }

    /**
     * Test password reset with valid token
     */
    public function test_password_reset_with_valid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('OldPassword123!'),
        ]);

        // Generate a valid token
        $token = Password::createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'email' => 'test@example.com',
            'token' => $token,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Password has been reset successfully. Please log in with your new password.'
            ]);

        // Verify password was changed
        $user->refresh();
        $this->assertTrue(Hash::check('NewPassword123!', $user->password));

        // Verify old password no longer works
        $this->assertFalse(Hash::check('OldPassword123!', $user->password));
    }

    /**
     * Test password reset with invalid token
     */
    public function test_password_reset_with_invalid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        $response = $this->postJson('/api/reset-password', [
            'email' => 'test@example.com',
            'token' => 'invalid-token',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Password reset failed. The token may be invalid or expired.'
            ]);
    }

    /**
     * Test password reset with expired token
     */
    public function test_password_reset_with_expired_token(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        // Generate a token and manually expire it
        $token = Password::createToken($user);

        // Travel forward in time beyond expiration (default is 60 minutes)
        $this->travel(61)->minutes();

        $response = $this->postJson('/api/reset-password', [
            'email' => 'test@example.com',
            'token' => $token,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(422);
    }

    /**
     * Test password reset with mismatched passwords
     */
    public function test_password_reset_with_mismatched_passwords(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        $token = Password::createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'email' => 'test@example.com',
            'token' => $token,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'DifferentPassword123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    /**
     * Test password reset with too short password
     */
    public function test_password_reset_with_short_password(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        $token = Password::createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'email' => 'test@example.com',
            'token' => $token,
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    /**
     * Test that password reset revokes all tokens
     */
    public function test_password_reset_revokes_all_tokens(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        // Create some tokens for the user
        $token1 = $user->createToken('device1')->plainTextToken;
        $token2 = $user->createToken('device2')->plainTextToken;

        $this->assertCount(2, $user->tokens);

        // Reset password
        $resetToken = Password::createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'email' => 'test@example.com',
            'token' => $resetToken,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(200);

        // Verify all tokens were revoked
        $user->refresh();
        $this->assertCount(0, $user->tokens);
    }

    /**
     * Test password reset rate limiting
     */
    public function test_password_reset_rate_limiting(): void
    {
        $user = User::factory()->create();
        $token = Password::createToken($user);

        // First 5 requests should succeed or fail based on token validity
        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/reset-password', [
                'email' => $user->email,
                'token' => $token,
                'password' => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ]);
            // We expect these to succeed or fail, but not be rate limited
            $this->assertNotEquals(429, $response->status());
        }

        // 6th request should be rate limited
        $response = $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(429); // Too Many Requests
    }
}
