import { Page } from '@playwright/test';

/**
 * Performance measurement result
 */
export interface PerformanceMeasurement {
  duration: number;
  startTime: number;
  endTime: number;
}

/**
 * Web Vitals metrics
 */
export interface WebVitals {
  FCP?: number;  // First Contentful Paint
  LCP?: number;  // Largest Contentful Paint
  FID?: number;  // First Input Delay
  CLS?: number;  // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
}

/**
 * Performance Utilities
 * Helper functions for measuring and tracking performance
 */
export class PerformanceUtils {
  /**
   * Measure page load time
   */
  static async measurePageLoad(page: Page, url: string): Promise<PerformanceMeasurement> {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();

    return {
      duration: endTime - startTime,
      startTime,
      endTime
    };
  }

  /**
   * Measure operation duration
   */
  static async measureOperation<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; measurement: PerformanceMeasurement }> {
    const startTime = Date.now();
    const result = await operation();
    const endTime = Date.now();

    return {
      result,
      measurement: {
        duration: endTime - startTime,
        startTime,
        endTime
      }
    };
  }

  /**
   * Get Web Vitals metrics from browser
   */
  static async getWebVitals(page: Page): Promise<WebVitals> {
    return await page.evaluate(() => {
      const vitals: WebVitals = {};

      // First Contentful Paint
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        vitals.FCP = fcpEntry.startTime;
      }

      // Largest Contentful Paint
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        vitals.LCP = lcpEntries[lcpEntries.length - 1].startTime;
      }

      // Time to First Byte
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navTiming) {
        vitals.TTFB = navTiming.responseStart - navTiming.requestStart;
      }

      // Cumulative Layout Shift
      const layoutShiftEntries = performance.getEntriesByType('layout-shift');
      let cls = 0;
      for (const entry of layoutShiftEntries) {
        const layoutShift = entry as any;
        if (!layoutShift.hadRecentInput) {
          cls += layoutShift.value;
        }
      }
      vitals.CLS = cls;

      return vitals;
    });
  }

  /**
   * Measure API response time
   */
  static async measureApiResponse(
    page: Page,
    urlPattern: string | RegExp,
    trigger: () => Promise<void>
  ): Promise<PerformanceMeasurement> {
    const startTime = Date.now();

    const responsePromise = page.waitForResponse(urlPattern, { timeout: 10000 });
    await trigger();
    await responsePromise;

    const endTime = Date.now();

    return {
      duration: endTime - startTime,
      startTime,
      endTime
    };
  }

  /**
   * Measure multiple operations and return average
   */
  static async measureAverage(
    operation: () => Promise<void>,
    iterations = 5
  ): Promise<{
    average: number;
    min: number;
    max: number;
    measurements: number[];
  }> {
    const measurements: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await operation();
      const duration = Date.now() - startTime;
      measurements.push(duration);
    }

    return {
      average: measurements.reduce((sum, m) => sum + m, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      measurements
    };
  }

  /**
   * Assert performance budget
   */
  static assertBudget(
    measurement: PerformanceMeasurement | number,
    budget: number,
    message?: string
  ): void {
    const duration = typeof measurement === 'number' ? measurement : measurement.duration;

    if (duration > budget) {
      throw new Error(
        message ||
          `Performance budget exceeded: ${duration}ms > ${budget}ms (over by ${duration - budget}ms)`
      );
    }
  }

  /**
   * Get navigation timing metrics
   */
  static async getNavigationTiming(page: Page): Promise<{
    dns: number;
    tcp: number;
    request: number;
    response: number;
    domParsing: number;
    domContentLoaded: number;
    loadComplete: number;
  }> {
    return await page.evaluate(() => {
      const timing = performance.timing;

      return {
        dns: timing.domainLookupEnd - timing.domainLookupStart,
        tcp: timing.connectEnd - timing.connectStart,
        request: timing.responseStart - timing.requestStart,
        response: timing.responseEnd - timing.responseStart,
        domParsing: timing.domInteractive - timing.domLoading,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
        loadComplete: timing.loadEventEnd - timing.loadEventStart
      };
    });
  }

  /**
   * Measure time to interactive
   */
  static async measureTimeToInteractive(page: Page): Promise<number> {
    await page.waitForLoadState('networkidle');

    return await page.evaluate(() => {
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navTiming.domInteractive - navTiming.fetchStart;
    });
  }

  /**
   * Log performance measurement
   */
  static logMeasurement(
    name: string,
    measurement: PerformanceMeasurement | number,
    budget?: number
  ): void {
    const duration = typeof measurement === 'number' ? measurement : measurement.duration;
    const budgetInfo = budget ? ` (budget: ${budget}ms)` : '';
    const status = budget && duration > budget ? '❌ OVER BUDGET' : '✅';

    console.log(`${status} ${name}: ${duration}ms${budgetInfo}`);
  }

  /**
   * Get resource loading metrics
   */
  static async getResourceMetrics(page: Page): Promise<{
    count: number;
    totalSize: number;
    totalDuration: number;
    byType: Record<string, { count: number; size: number; duration: number }>;
  }> {
    return await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      const byType: Record<string, { count: number; size: number; duration: number }> = {};
      let totalSize = 0;
      let totalDuration = 0;

      resources.forEach(resource => {
        const type = resource.initiatorType || 'other';
        const size = resource.transferSize || 0;
        const duration = resource.duration;

        if (!byType[type]) {
          byType[type] = { count: 0, size: 0, duration: 0 };
        }

        byType[type].count++;
        byType[type].size += size;
        byType[type].duration += duration;

        totalSize += size;
        totalDuration += duration;
      });

      return {
        count: resources.length,
        totalSize,
        totalDuration,
        byType
      };
    });
  }

  /**
   * Wait for performance mark
   */
  static async waitForMark(page: Page, markName: string, timeout = 10000): Promise<number> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const mark = await page.evaluate((name) => {
        const marks = performance.getEntriesByName(name, 'mark');
        return marks.length > 0 ? marks[0].startTime : null;
      }, markName);

      if (mark !== null) {
        return mark;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Performance mark "${markName}" not found within ${timeout}ms`);
  }

  /**
   * Create performance report
   */
  static createReport(measurements: Record<string, PerformanceMeasurement | number>): string {
    const lines = ['Performance Report', '=================', ''];

    for (const [name, measurement] of Object.entries(measurements)) {
      const duration = typeof measurement === 'number' ? measurement : measurement.duration;
      lines.push(`${name}: ${duration}ms`);
    }

    return lines.join('\n');
  }
}
