import { DataUtils } from '../utils/data.utils';
import * as fs from 'fs';

/**
 * Test file data interface
 */
export interface TestFileData {
  path: string;
  name: string;
  subject?: string;
  category?: 'Materialy' | 'Otazky' | 'Prednasky' | 'Seminare';
  extension: string;
  size: number;
  content?: string | Buffer;
}

/**
 * File Builder
 * Fluent API for creating test files
 */
export class FileBuilder {
  private data: Partial<TestFileData> = {};
  private shouldCreateFile = false;

  /**
   * Create a new file builder
   */
  static create(): FileBuilder {
    return new FileBuilder();
  }

  /**
   * Set the file name
   */
  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  /**
   * Set the subject name
   */
  withSubject(subject: string): this {
    this.data.subject = subject;
    return this;
  }

  /**
   * Set the category
   */
  withCategory(category: 'Materialy' | 'Otazky' | 'Prednasky' | 'Seminare'): this {
    this.data.category = category;
    return this;
  }

  /**
   * Set the file extension
   */
  withExtension(extension: string): this {
    this.data.extension = extension;
    return this;
  }

  /**
   * Set file content
   */
  withContent(content: string | Buffer): this {
    this.data.content = content;
    return this;
  }

  /**
   * Set file size
   */
  withSize(size: number): this {
    this.data.size = size;
    return this;
  }

  /**
   * Create a PDF file
   */
  asPdf(): this {
    this.data.extension = 'pdf';
    if (!this.data.content) {
      this.data.content = '%PDF-1.4\nTest PDF content';
    }
    return this;
  }

  /**
   * Create a text file
   */
  asTxt(): this {
    this.data.extension = 'txt';
    if (!this.data.content) {
      this.data.content = 'Test text content';
    }
    return this;
  }

  /**
   * Create a DOCX file (simulated)
   */
  asDocx(): this {
    this.data.extension = 'docx';
    if (!this.data.content) {
      this.data.content = 'Test DOCX content';
    }
    return this;
  }

  /**
   * Create a small file (1KB)
   */
  small(): this {
    this.data.size = 1024;
    return this;
  }

  /**
   * Create a medium file (1MB)
   */
  medium(): this {
    this.data.size = 1024 * 1024;
    return this;
  }

  /**
   * Create a large file (10MB)
   */
  large(): this {
    this.data.size = 10 * 1024 * 1024;
    return this;
  }

  /**
   * Create an extra large file (60MB - over limit)
   */
  extraLarge(): this {
    this.data.size = 60 * 1024 * 1024;
    return this;
  }

  /**
   * Set category to Materialy
   */
  materialy(): this {
    this.data.category = 'Materialy';
    return this;
  }

  /**
   * Set category to Otazky
   */
  otazky(): this {
    this.data.category = 'Otazky';
    return this;
  }

  /**
   * Set category to Prednasky
   */
  prednasky(): this {
    this.data.category = 'Prednasky';
    return this;
  }

  /**
   * Set category to Seminare
   */
  seminare(): this {
    this.data.category = 'Seminare';
    return this;
  }

  /**
   * Mark that file should be created on disk
   */
  create(): this {
    this.shouldCreateFile = true;
    return this;
  }

  /**
   * Build the test file data
   */
  build(): TestFileData {
    // Set defaults
    const extension = this.data.extension || 'pdf';
    const name = this.data.name || DataUtils.createTestFileName(extension);
    const subject = this.data.subject || DataUtils.randomSubjectName();
    const category = this.data.category || 'Materialy';

    let content = this.data.content;
    let size = this.data.size || 1024;

    // Generate content based on extension if not provided
    if (!content) {
      if (extension === 'pdf') {
        content = '%PDF-1.4\nTest PDF content';
      } else if (extension === 'txt') {
        content = 'Test text content';
      } else {
        content = `Test ${extension} content`;
      }
    }

    // Pad content to reach desired size
    if (typeof content === 'string' && size > content.length) {
      content += 'A'.repeat(size - content.length);
    }

    // Create file on disk if requested
    let path = '';
    if (this.shouldCreateFile) {
      path = DataUtils.createTempFile(name, content);
      size = fs.statSync(path).size;
    }

    return {
      path,
      name,
      subject,
      category,
      extension,
      size,
      content
    };
  }

  /**
   * Build and create file on disk
   */
  buildAndCreate(): TestFileData {
    this.shouldCreateFile = true;
    return this.build();
  }
}
