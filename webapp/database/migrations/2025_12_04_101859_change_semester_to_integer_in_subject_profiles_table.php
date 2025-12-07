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
        // PostgreSQL requires explicit USING clause for type conversion
        \DB::statement('ALTER TABLE subject_profiles ALTER COLUMN semester TYPE integer USING (
            CASE
                WHEN semester IS NULL THEN NULL
                WHEN semester ~ \'^\d+$\' THEN semester::integer
                ELSE NULL
            END
        )');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \DB::statement('ALTER TABLE subject_profiles ALTER COLUMN semester TYPE varchar(255) USING semester::varchar');
    }
};
