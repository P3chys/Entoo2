<?php

namespace App\Providers;

use App\Models\UploadedFile;
use App\Policies\FilePolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        UploadedFile::class => FilePolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Define Gate for file deletion
        \Illuminate\Support\Facades\Gate::define('delete-file', function ($user, $file) {
            \Log::info('Gate delete-file called', [
                'user_id' => $user?->id,
                'user_email' => $user?->email,
                'is_admin' => $user?->is_admin ?? false,
                'file_id' => $file?->id,
                'file_user_id' => $file?->user_id,
            ]);

            // Admins can delete any file
            if ($user->is_admin) {
                \Log::info('Admin access granted via Gate');

                return true;
            }

            // Test user can delete any file (for E2E tests)
            if ($user->email === 'playwright-test@entoo.cz') {
                \Log::info('Test user access granted via Gate');

                return true;
            }

            // Owners can delete their own files
            $isOwner = $user->id === $file->user_id;
            \Log::info('Owner check', ['is_owner' => $isOwner]);

            return $isOwner;
        });
    }
}
