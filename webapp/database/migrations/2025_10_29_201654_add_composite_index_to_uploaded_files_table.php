<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * This adds a composite index optimized for the common query pattern:
     * SELECT * FROM uploaded_files
     * WHERE subject_name = 'X' AND category = 'Y'
     * ORDER BY created_at DESC;
     *
     * Expected improvement: 50-70% faster file listing queries
     */
    public function up(): void
    {
        Schema::table('uploaded_files', function (Blueprint $table) {
            $table->index(['subject_name', 'category', 'created_at'], 'idx_subject_category_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('uploaded_files', function (Blueprint $table) {
            $table->dropIndex('idx_subject_category_date');
        });
    }
};
