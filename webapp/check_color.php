<?php

use App\Models\SubjectProfile;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$profile = SubjectProfile::latest()->first();

if ($profile) {
    echo "Latest Profile: " . $profile->subject_name . "\n";
    echo "Color: " . ($profile->color ?? 'NULL') . "\n";
} else {
    echo "No profiles found.\n";
}
