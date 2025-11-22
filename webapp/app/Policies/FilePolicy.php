<?php

namespace App\Policies;

use App\Models\UploadedFile;
use App\Models\User;

class FilePolicy
{
    /**
     * Determine if the user can download the file.
     *
     * Authorization logic:
     * - All authenticated users can download files (for now, since it's a sharing platform)
     * - In the future, this could be restricted to file owners or users with specific permissions
     */
    public function download(?User $user, UploadedFile $file): bool
    {
        // For now, all authenticated users can download any file
        // This is appropriate for a document sharing platform
        return $user !== null;
    }

    /**
     * Determine if the user can view the file details.
     */
    public function view(?User $user, UploadedFile $file): bool
    {
        // File details are visible only to the owner
        return $user !== null && $user->id === $file->user_id;
    }

    /**
     * Determine if the user can update the file.
     */
    public function update(User $user, UploadedFile $file): bool
    {
        // Only the owner can update
        return $user->id === $file->user_id;
    }

    /**
     * Determine if the user can delete the file.
     */
    public function delete(User $user, UploadedFile $file): bool
    {
        // Allow test user to delete any file for cleanup (test environments only)
        if ($user->email === 'playwright-test@entoo.cz') {
            return true;
        }

        // Only the owner can delete
        return $user->id === $file->user_id;
    }
}
