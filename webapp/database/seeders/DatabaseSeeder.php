<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create the main user account
        // ID 28 is referenced by existing files in Elasticsearch
        User::factory()->create([
            'id' => 28,
            'name' => 'Adam Pech',
            'email' => 'pechysadam@gmail.com',
            'password' => bcrypt('password'), // Default password, should be changed
        ]);

        $this->command->info('Created user: Adam Pech (ID: 28, Email: pechysadam@gmail.com)');
        $this->command->warn('Default password: "password" - Please change this in production!');
        $this->command->warn('Remember to run: php artisan sync:db-from-elasticsearch --user=28');
    }
}
