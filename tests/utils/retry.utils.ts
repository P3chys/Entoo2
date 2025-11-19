/**
 * Retry Utilities
 * Helper functions for retrying operations
 */
export class RetryUtils {
  /**
   * Retry an operation with exponential backoff
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      delay?: number;
      exponentialBackoff?: boolean;
      onRetry?: (error: Error, attempt: number) => void;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      delay = 1000,
      exponentialBackoff = false,
      onRetry
    } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        const currentDelay = exponentialBackoff
          ? delay * Math.pow(2, attempt - 1)
          : delay;

        if (onRetry) {
          onRetry(error as Error, attempt);
        }

        await new Promise(resolve => setTimeout(resolve, currentDelay));
      }
    }

    throw new Error('Unreachable');
  }

  /**
   * Retry until condition is met
   */
  static async untilCondition(
    condition: () => Promise<boolean>,
    options: {
      maxRetries?: number;
      delay?: number;
      timeout?: number;
    } = {}
  ): Promise<boolean> {
    const { maxRetries = 10, delay = 500, timeout = 10000 } = options;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout after ${timeout}ms`);
      }

      if (await condition()) {
        return true;
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return false;
  }

  /**
   * Retry with custom error handling
   */
  static async withCustomErrorHandling<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      shouldRetry?: (error: Error) => boolean;
      onError?: (error: Error, attempt: number) => void;
      delay?: number;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      shouldRetry = () => true,
      onError,
      delay = 1000
    } = options;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (onError) {
          onError(lastError, attempt);
        }

        if (attempt === maxRetries || !shouldRetry(lastError)) {
          throw lastError;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Unreachable');
  }

  /**
   * Retry with timeout
   */
  static async withTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Retry specific types of errors
   */
  static async retryOnError<T>(
    fn: () => Promise<T>,
    errorTypes: (new (...args: any[]) => Error)[],
    options: {
      maxRetries?: number;
      delay?: number;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, delay = 1000 } = options;

    return this.withCustomErrorHandling(fn, {
      maxRetries,
      delay,
      shouldRetry: (error: Error) => {
        return errorTypes.some(ErrorType => error instanceof ErrorType);
      }
    });
  }

  /**
   * Poll until success or timeout
   */
  static async poll<T>(
    fn: () => Promise<T>,
    options: {
      interval?: number;
      timeout?: number;
      validate?: (result: T) => boolean;
    } = {}
  ): Promise<T> {
    const { interval = 500, timeout = 10000, validate } = options;
    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;

      if (elapsed > timeout) {
        throw new Error(`Polling timed out after ${timeout}ms`);
      }

      try {
        const result = await fn();

        if (!validate || validate(result)) {
          return result;
        }
      } catch (error) {
        // Continue polling on error
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}
