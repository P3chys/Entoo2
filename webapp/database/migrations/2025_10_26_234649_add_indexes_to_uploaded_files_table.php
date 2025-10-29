<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('uploaded_files', function (Blueprint $table) {
            // Add index on subject_name for fast filtering by subject
            $table->index('subject_name', 'idx_uploaded_files_subject_name');

            // Add index on category for fast filtering by category
            $table->index('category', 'idx_uploaded_files_category');

            // Add composite index on (subject_name, category) for queries filtering by both
            $table->index(['subject_name', 'category'], 'idx_uploaded_files_subject_category');

            // Add index on created_at for sorting
            $table->index('created_at', 'idx_uploaded_files_created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('uploaded_files', function (Blueprint $table) {
            $table->dropIndex('idx_uploaded_files_subject_name');
            $table->dropIndex('idx_uploaded_files_category');
            $table->dropIndex('idx_uploaded_files_subject_category');
            $table->dropIndex('idx_uploaded_files_created_at');
        });
    }
};
