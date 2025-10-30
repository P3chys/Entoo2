<?php

require __DIR__ . '/vendor/autoload.php';

use App\Services\DocumentParserService;
use Illuminate\Support\Facades\Log;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Test PDF file
$testPdf = '/old_entoo/entoo_subjects/1. odborný cizí jazyk 4 - angličtina/Materialy/Contract law.pdf';

echo "Testing PDF text extraction with pdftotext...\n";
echo "Test file: {$testPdf}\n\n";

if (!file_exists($testPdf)) {
    echo "ERROR: Test PDF file not found!\n";
    exit(1);
}

$fileSize = filesize($testPdf);
echo "File size: " . round($fileSize / 1024, 2) . " KB\n\n";

try {
    $parser = new DocumentParserService();

    echo "Extracting text...\n";
    $startTime = microtime(true);
    $text = $parser->extractText($testPdf, 'pdf');
    $duration = round((microtime(true) - $startTime) * 1000, 2);

    echo "\n✓ Extraction completed in {$duration}ms\n";
    echo "Extracted text length: " . strlen($text) . " characters\n\n";

    if (strlen($text) > 0) {
        echo "First 500 characters of extracted text:\n";
        echo "----------------------------------------\n";
        echo substr($text, 0, 500) . "\n";
        echo "----------------------------------------\n\n";

        echo "✓ PDF parsing with pdftotext is working correctly!\n";
        exit(0);
    } else {
        echo "⚠ Warning: No text extracted from PDF\n";
        echo "This could mean:\n";
        echo "  - The PDF is image-based (scanned document)\n";
        echo "  - The PDF is encrypted or protected\n";
        echo "  - pdftotext failed to extract text\n";
        exit(1);
    }
} catch (Exception $e) {
    echo "✗ ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
