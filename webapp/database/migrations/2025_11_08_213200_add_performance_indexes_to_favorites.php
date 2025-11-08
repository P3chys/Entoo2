<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds performance indexes to favorite_subjects table for:
     * - Fast subject name lookups
     * - Optimized user + subject queries (already has unique index)
     *
     * Note: favorite_subjects already has:
     * - unique index on (user_id, subject_name)
     * - index on user_id
     */
    public function up(): void
    {
        Schema::table('favorite_subjects', function (Blueprint $table) {
            // Add index on subject_name for queries filtering by subject
            // This helps when checking if a subject is favorited by any user
            $table->index('subject_name', 'idx_favorite_subjects_subject_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('favorite_subjects', function (Blueprint $table) {
            $table->dropIndex('idx_favorite_subjects_subject_name');
        });
    }
};
