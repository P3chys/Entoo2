import * as fs from 'fs';
import * as path from 'path';

/**
 * Data Utilities
 * Helper functions for generating test data
 */
export class DataUtils {
  /**
   * Generate a unique email address
   */
  static generateEmail(prefix = 'test'): string {
    const timestamp = Date.now();
    const random = this.randomString(6);
    return `${prefix}-${timestamp}-${random}@entoo.cz`;
  }

  /**
   * Generate a random string
   */
  static randomString(length = 10): string {
    return Math.random().toString(36).substring(2, length + 2);
  }

  /**
   * Generate a random integer within range
   */
  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a unique test file name
   */
  static createTestFileName(extension = 'pdf'): string {
    const timestamp = Date.now();
    const random = this.randomString(6);
    return `test-${timestamp}-${random}.${extension}`;
  }

  /**
   * Generate a random subject name
   */
  static randomSubjectName(): string {
    const subjects = [
      'Mathematics',
      'Physics',
      'Computer Science',
      'Chemistry',
      'Biology',
      'History',
      'Literature',
      'Economics'
    ];
    const randomSubject = subjects[this.randomInt(0, subjects.length - 1)];
    const random = this.randomString(4);
    return `${randomSubject}-${random}`;
  }

  /**
   * Generate a random category
   */
  static randomCategory(): 'Materialy' | 'Otazky' | 'Prednasky' | 'Seminare' {
    const categories: ('Materialy' | 'Otazky' | 'Prednasky' | 'Seminare')[] = [
      'Materialy',
      'Otazky',
      'Prednasky',
      'Seminare'
    ];
    return categories[this.randomInt(0, categories.length - 1)];
  }

  /**
   * Create a temporary test file
   */
  static createTempFile(
    fileName: string,
    content: string | Buffer,
    directory?: string
  ): string {
    const dir = directory || path.join(__dirname, '../tests/fixtures');

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, content);

    return filePath;
  }

  /**
   * Create a test PDF file
   */
  static createTestPdf(fileName?: string, size?: number): string {
    const name = fileName || this.createTestFileName('pdf');
    let content = '%PDF-1.4\nTest PDF content\n';

    // Pad content to reach desired size
    if (size) {
      const padding = 'A'.repeat(Math.max(0, size - content.length));
      content += padding;
    }

    return this.createTempFile(name, content);
  }

  /**
   * Create a test text file
   */
  static createTestTxt(fileName?: string, content?: string): string {
    const name = fileName || this.createTestFileName('txt');
    const textContent = content || 'Test text file content for testing.';

    return this.createTempFile(name, textContent);
  }

  /**
   * Create a large test file (for size limit testing)
   */
  static createLargeFile(sizeInMB: number, extension = 'pdf'): string {
    const fileName = this.createTestFileName(extension);
    const sizeInBytes = sizeInMB * 1024 * 1024;
    const content = Buffer.alloc(sizeInBytes, 'A');

    return this.createTempFile(fileName, content);
  }

  /**
   * Delete a temporary test file
   */
  static deleteTempFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Generate test user data
   */
  static generateUserData(): {
    name: string;
    email: string;
    password: string;
  } {
    return {
      name: `Test User ${this.randomString(6)}`,
      email: this.generateEmail('user'),
      password: 'password123'
    };
  }

  /**
   * Generate a unique identifier
   */
  static generateId(): string {
    return `${Date.now()}-${this.randomString(8)}`;
  }

  /**
   * Generate a timestamp-based unique string
   */
  static timestamp(): string {
    return Date.now().toString();
  }

  /**
   * Generate random boolean
   */
  static randomBoolean(): boolean {
    return Math.random() < 0.5;
  }

  /**
   * Pick random item from array
   */
  static randomItem<T>(array: T[]): T {
    return array[this.randomInt(0, array.length - 1)];
  }

  /**
   * Generate array of unique items
   */
  static uniqueArray<T>(generator: () => T, count: number): T[] {
    const items = new Set<T>();
    let attempts = 0;
    const maxAttempts = count * 10;

    while (items.size < count && attempts < maxAttempts) {
      items.add(generator());
      attempts++;
    }

    return Array.from(items);
  }

  /**
   * Generate random date within range
   */
  static randomDate(start: Date, end: Date): Date {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const randomTime = startTime + Math.random() * (endTime - startTime);
    return new Date(randomTime);
  }

  /**
   * Format file size in human-readable format
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
