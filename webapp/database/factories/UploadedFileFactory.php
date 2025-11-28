<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\UploadedFile>
 */
class UploadedFileFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $categories = ['Materialy', 'Otazky', 'Prednasky', 'Seminare'];
        $extensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'];
        $extension = fake()->randomElement($extensions);

        return [
            'user_id' => User::factory(),
            'filename' => fake()->uuid().'.'.$extension,
            'original_filename' => fake()->words(3, true).'.'.$extension,
            'filepath' => 'uploads/'.fake()->slug(2).'/'.fake()->slug().'/'.fake()->uuid().'.'.$extension,
            'subject_name' => fake()->words(2, true),
            'category' => fake()->randomElement($categories),
            'file_size' => fake()->numberBetween(1024, 10485760), // 1KB to 10MB
            'file_extension' => $extension,
            'processing_status' => 'completed',
            'processed_at' => now(),
        ];
    }

    /**
     * Indicate that the file is pending processing.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'processing_status' => 'pending',
            'processed_at' => null,
        ]);
    }

    /**
     * Indicate that the file processing failed.
     */
    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'processing_status' => 'failed',
            'processing_error' => 'Test error message',
            'processed_at' => now(),
        ]);
    }
}
