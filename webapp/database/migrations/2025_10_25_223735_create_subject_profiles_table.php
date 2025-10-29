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
        Schema::create('subject_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('subject_name')->unique(); // Must match uploaded_files.subject_name
            $table->text('description')->nullable(); // Subject description/overview
            $table->string('professor_name')->nullable(); // Professor/instructor name
            $table->string('course_code')->nullable(); // e.g., "CS101"
            $table->string('semester')->nullable(); // e.g., "Winter 2024"
            $table->integer('year')->nullable(); // Academic year
            $table->text('notes')->nullable(); // Additional notes/info
            $table->string('color')->nullable(); // Color for UI display
            $table->integer('credits')->nullable(); // Course credits
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // Index for faster lookups
            $table->index('subject_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subject_profiles');
    }
};
