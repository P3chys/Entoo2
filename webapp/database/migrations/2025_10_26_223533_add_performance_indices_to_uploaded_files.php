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
            // Add indices for commonly queried columns
            $table->index('subject_name');
            $table->index('category');
            $table->index('file_extension');
            $table->index('created_at');
            $table->index(['subject_name', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('uploaded_files', function (Blueprint $table) {
            // Drop the indices
            $table->dropIndex(['subject_name']);
            $table->dropIndex(['category']);
            $table->dropIndex(['file_extension']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['subject_name', 'category']);
        });
    }
};
