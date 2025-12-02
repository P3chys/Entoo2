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
        Schema::create('subject_comments', function (Blueprint $table) {
            $table->id();
            $table->string('subject_name'); // References subject_profiles.subject_name
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete(); // Author of comment
            $table->text('comment'); // Comment text
            $table->timestamps();

            // Indexes for efficient queries
            $table->index('subject_name');
            $table->index('created_at'); // For ordering by timestamp
            $table->index(['subject_name', 'created_at']); // Composite index for subject comments ordered by time
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subject_comments');
    }
};
