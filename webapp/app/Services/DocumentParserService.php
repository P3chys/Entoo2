<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpPresentation\IOFactory as PresentationIOFactory;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use Smalot\PdfParser\Parser as PdfParser;

class DocumentParserService
{
    /**
     * Extract text content from a file based on its extension
     *
     * @throws Exception
     */
    public function extractText(string $filepath, string $extension): string
    {
        if (! file_exists($filepath)) {
            throw new Exception("File not found: {$filepath}");
        }

        // Normalize extension first
        $extension = strtolower($extension);

        // Check file size - skip files larger than 5MB for PDFs, 20MB for others
        // PDF parsing is particularly memory-intensive and slow
        $maxFileSize = ($extension === 'pdf') ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
        $fileSize = filesize($filepath);
        if ($fileSize > $maxFileSize) {
            $sizeMB = round($fileSize / 1024 / 1024, 2);
            Log::warning("File too large to parse: {$filepath} ({$sizeMB}MB)");

            return ''; // Return empty string for large files
        }

        // Set memory limit and max execution time
        $originalMemoryLimit = ini_get('memory_limit');
        $originalMaxExecutionTime = ini_get('max_execution_time');

        ini_set('memory_limit', '512M');
        set_time_limit(20); // 20 seconds max per file

        try {
            $text = match ($extension) {
                'pdf' => $this->extractTextFromPdf($filepath),
                'doc', 'docx' => $this->extractTextFromWord($filepath),
                'ppt', 'pptx' => $this->extractTextFromPowerPoint($filepath),
                'txt' => $this->extractTextFromPlainText($filepath),
                default => throw new Exception("Unsupported file extension: {$extension}")
            };

            // Restore original settings
            ini_set('memory_limit', $originalMemoryLimit);
            set_time_limit((int) $originalMaxExecutionTime);

            return $text;
        } catch (Exception $e) {
            // Restore original settings
            ini_set('memory_limit', $originalMemoryLimit);
            set_time_limit((int) $originalMaxExecutionTime);

            throw $e;
        }
    }

    /**
     * Extract text from PDF file using pdftotext (poppler-utils)
     *
     * This implementation uses the external pdftotext tool which is much faster
     * and more robust than PHP-based PDF parsing libraries. It handles complex
     * PDFs efficiently and doesn't suffer from memory leaks or timeouts.
     */
    private function extractTextFromPdf(string $filepath): string
    {
        try {
            // Check if pdftotext is available
            $pdftotextPath = trim(shell_exec('which pdftotext') ?? '');
            if (empty($pdftotextPath)) {
                Log::warning('pdftotext not found, PDF text extraction disabled');

                return '';
            }

            // Escape filepath for shell command
            $escapedPath = escapeshellarg($filepath);

            // Use pdftotext with layout preservation and UTF-8 encoding
            // -layout: Maintain original physical layout
            // -enc UTF-8: Output in UTF-8 encoding
            // -nopgbrk: Don't insert page breaks
            // -eol unix: Use Unix line endings
            // - : Output to stdout
            $command = "pdftotext -layout -enc UTF-8 -nopgbrk -eol unix {$escapedPath} - 2>&1";

            $output = shell_exec($command);

            if ($output === null) {
                Log::warning("pdftotext command failed for: {$filepath}");

                return '';
            }

            // Limit output to first 100,000 characters to prevent memory issues
            $text = substr($output, 0, 100000);

            // Clean up extracted text
            $text = $this->cleanText($text);

            if (empty($text)) {
                Log::info("No text extracted from PDF: {$filepath}");
            }

            return $text;
        } catch (Exception $e) {
            Log::warning("Failed to parse PDF: {$filepath}", ['error' => $e->getMessage()]);

            // Return empty string instead of throwing exception
            return '';
        }
    }

    /**
     * Extract text from Word document
     */
    private function extractTextFromWord(string $filepath): string
    {
        try {
            $phpWord = WordIOFactory::load($filepath);
            $text = '';

            foreach ($phpWord->getSections() as $section) {
                foreach ($section->getElements() as $element) {
                    $text .= $this->extractWordElement($element)."\n";
                }
            }

            return $this->cleanText($text);
        } catch (Exception $e) {
            Log::error("Failed to parse Word document: {$filepath}", ['error' => $e->getMessage()]);
            throw new Exception("Failed to parse Word document: {$e->getMessage()}");
        }
    }

    /**
     * Extract text from Word element recursively
     *
     * @param  mixed  $element
     */
    private function extractWordElement($element): string
    {
        $text = '';

        if (method_exists($element, 'getText')) {
            $text .= $element->getText().' ';
        }

        if (method_exists($element, 'getElements')) {
            foreach ($element->getElements() as $childElement) {
                $text .= $this->extractWordElement($childElement);
            }
        }

        return $text;
    }

    /**
     * Extract text from PowerPoint presentation
     */
    private function extractTextFromPowerPoint(string $filepath): string
    {
        try {
            $presentation = PresentationIOFactory::load($filepath);
            $text = '';

            foreach ($presentation->getAllSlides() as $slide) {
                foreach ($slide->getShapeCollection() as $shape) {
                    if (method_exists($shape, 'getText')) {
                        $text .= $shape->getText()."\n";
                    }

                    if (method_exists($shape, 'getParagraphs')) {
                        foreach ($shape->getParagraphs() as $paragraph) {
                            foreach ($paragraph->getRichTextElements() as $element) {
                                if (method_exists($element, 'getText')) {
                                    $text .= $element->getText().' ';
                                }
                            }
                            $text .= "\n";
                        }
                    }
                }
            }

            return $this->cleanText($text);
        } catch (Exception $e) {
            Log::error("Failed to parse PowerPoint: {$filepath}", ['error' => $e->getMessage()]);
            throw new Exception("Failed to parse PowerPoint presentation: {$e->getMessage()}");
        }
    }

    /**
     * Extract text from plain text file
     */
    private function extractTextFromPlainText(string $filepath): string
    {
        try {
            $content = file_get_contents($filepath);
            if ($content === false) {
                throw new Exception('Failed to read file');
            }

            return $this->cleanText($content);
        } catch (Exception $e) {
            Log::error("Failed to read text file: {$filepath}", ['error' => $e->getMessage()]);
            throw new Exception("Failed to read text file: {$e->getMessage()}");
        }
    }

    /**
     * Clean and normalize extracted text
     */
    private function cleanText(string $text): string
    {
        // Remove excessive whitespace
        $text = preg_replace('/\s+/', ' ', $text);

        // Remove control characters
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text);

        // Trim whitespace
        $text = trim($text);

        return $text;
    }

    /**
     * Get metadata from document
     */
    public function getMetadata(string $filepath, string $extension): array
    {
        $metadata = [
            'file_size' => filesize($filepath),
            'mime_type' => mime_content_type($filepath),
            'extension' => $extension,
        ];

        try {
            $extension = strtolower($extension);

            if ($extension === 'pdf') {
                $parser = new PdfParser;
                $pdf = $parser->parseFile($filepath);
                $details = $pdf->getDetails();

                $metadata['pages'] = $details['Pages'] ?? null;
                $metadata['title'] = $details['Title'] ?? null;
                $metadata['author'] = $details['Author'] ?? null;
                $metadata['subject'] = $details['Subject'] ?? null;
                $metadata['creator'] = $details['Creator'] ?? null;
            } elseif (in_array($extension, ['doc', 'docx'])) {
                $phpWord = WordIOFactory::load($filepath);
                $properties = $phpWord->getDocInfo();

                $metadata['title'] = $properties->getTitle();
                $metadata['author'] = $properties->getCreator();
                $metadata['subject'] = $properties->getSubject();
            } elseif (in_array($extension, ['ppt', 'pptx'])) {
                $presentation = PresentationIOFactory::load($filepath);
                $properties = $presentation->getDocumentProperties();

                $metadata['title'] = $properties->getTitle();
                $metadata['author'] = $properties->getCreator();
                $metadata['subject'] = $properties->getSubject();
                $metadata['slides'] = $presentation->getSlideCount();
            }
        } catch (Exception $e) {
            Log::warning("Failed to extract metadata from {$filepath}", ['error' => $e->getMessage()]);
        }

        return $metadata;
    }

    /**
     * Check if file type is supported
     */
    public function isSupported(string $extension): bool
    {
        $supported = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'];

        return in_array(strtolower($extension), $supported);
    }

    /**
     * Get list of supported file extensions
     */
    public function getSupportedExtensions(): array
    {
        return ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'];
    }
}
