/**
 * Global Teardown - Runs after all tests complete
 * Cleans up test data created during the test run
 *
 * Uses the artisan cleanup command which bypasses API authorization
 * and directly cleans PostgreSQL, Elasticsearch, and Redis cache.
 */

import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Running global teardown - cleaning up test data...\n');

  try {
    // Run artisan cleanup command
    console.log('🔧 Running artisan cleanup:test-data command...\n');

    const { stdout, stderr } = await execAsync('docker exec php php artisan cleanup:test-data --all');

    if (stdout) {
      console.log(stdout);
    }

    if (stderr && !stderr.includes('Warning')) {
      console.error('stderr:', stderr);
    }

    console.log('✅ Global teardown complete\n');
  } catch (error) {
    console.error('❌ Error during global teardown:', error);
  }
}

export default globalTeardown;
