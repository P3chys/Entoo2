<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use PhpOffice\PhpPresentation\IOFactory as PresentationIOFactory;
use Smalot\PdfParser\Parser as PdfParser;

class DocumentParserService
{
    /**
     * Extract text content from a file based on its extension
     *
     * @param string $filepath
     * @param string $extension
     * @return string
     * @throws Exception
     */
    public function extractText(string $filepath, string $extension): string
    {
        if (!file_exists($filepath)) {
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
            return ""; // Return empty string for large files
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
            set_time_limit((int)$originalMaxExecutionTime);

            return $text;
        } catch (Exception $e) {
            // Restore original settings
            ini_set('memory_limit', $originalMemoryLimit);
            set_time_limit((int)$originalMaxExecutionTime);

            throw $e;
        }
    }

    /**
     * Extract text from PDF file
     *
     * @param string $filepath
     * @return string
     */
    private function extractTextFromPdf(string $filepath): string
    {
        // TODO: PDF text extraction is temporarily disabled due to performance issues
        // with complex PDF files. The PDF parser can hang or timeout on certain files.
        // Files will still be indexed with metadata, but without text content.
        // Consider implementing a more robust PDF parsing solution (e.g., using
        // external tools like pdftotext, or processing PDFs asynchronously in a queue)

        Log::info("PDF text extraction disabled for: {$filepath}");
        return "";

        /* Original implementation - disabled for now
        try {
            // Skip PDF parsing for very large or complex files
            // Check file size - be more conservative for PDFs
            $fileSize = filesize($filepath);
            if ($fileSize > 2 * 1024 * 1024) { // 2MB
                $sizeMB = round($fileSize / 1024 / 1024, 2);
                Log::info("Skipping PDF text extraction for large file: {$filepath} ({$sizeMB}MB)");
                return "";
            }

            $parser = new PdfParser();
            $pdf = $parser->parseFile($filepath);
            $text = $pdf->getText();

            // Clean up extracted text
            $text = $this->cleanText($text);

            return $text;
        } catch (Exception $e) {
            Log::warning("Failed to parse PDF: {$filepath}", ['error' => $e->getMessage()]);
            // Return empty string instead of throwing exception
            return "";
        }
        */
    }

    /**
     * Extract text from Word document
     *
     * @param string $filepath
     * @return string
     */
    private function extractTextFromWord(string $filepath): string
    {
        try {
            $phpWord = WordIOFactory::load($filepath);
            $text = '';

            foreach ($phpWord->getSections() as $section) {
                foreach ($section->getElements() as $element) {
                    $text .= $this->extractWordElement($element) . "\n";
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
     * @param mixed $element
     * @return string
     */
    private function extractWordElement($element): string
    {
        $text = '';

        if (method_exists($element, 'getText')) {
            $text .= $element->getText() . ' ';
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
     *
     * @param string $filepath
     * @return string
     */
    private function extractTextFromPowerPoint(string $filepath): string
    {
        try {
            $presentation = PresentationIOFactory::load($filepath);
            $text = '';

            foreach ($presentation->getAllSlides() as $slide) {
                foreach ($slide->getShapeCollection() as $shape) {
                    if (method_exists($shape, 'getText')) {
                        $text .= $shape->getText() . "\n";
                    }

                    if (method_exists($shape, 'getParagraphs')) {
                        foreach ($shape->getParagraphs() as $paragraph) {
                            foreach ($paragraph->getRichTextElements() as $element) {
                                if (method_exists($element, 'getText')) {
                                    $text .= $element->getText() . ' ';
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
     *
     * @param string $filepath
     * @return string
     */
    private function extractTextFromPlainText(string $filepath): string
    {
        try {
            $content = file_get_contents($filepath);
            if ($content === false) {
                throw new Exception("Failed to read file");
            }
            return $this->cleanText($content);
        } catch (Exception $e) {
            Log::error("Failed to read text file: {$filepath}", ['error' => $e->getMessage()]);
            throw new Exception("Failed to read text file: {$e->getMessage()}");
        }
    }

    /**
     * Clean and normalize extracted text
     *
     * @param string $text
     * @return string
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
     *
     * @param string $filepath
     * @param string $extension
     * @return array
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
                $parser = new PdfParser();
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
     *
     * @param string $extension
     * @return bool
     */
    public function isSupported(string $extension): bool
    {
        $supported = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'];
        return in_array(strtolower($extension), $supported);
    }

    /**
     * Get list of supported file extensions
     *
     * @return array
     */
    public function getSupportedExtensions(): array
    {
        return ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'];
    }
}
