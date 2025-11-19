/**
 * Standalone Cleanup Script
 * Run manually to clean up test data: npx ts-node scripts/cleanup-test-data.ts
 *
 * Uses the artisan cleanup command which bypasses API authorization
 * and directly cleans PostgreSQL, Elasticsearch, and Redis cache.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function main() {
  console.log('🧹 Starting manual test data cleanup...\n');

  try {
    // Run artisan cleanup command
    console.log('🔧 Running artisan cleanup:test-data command...\n');

    const { stdout, stderr } = await execAsync('docker exec php php artisan cleanup:test-data --all');

    if (stdout) {
      console.log(stdout);
    }

    if (stderr) {
      console.error('stderr:', stderr);
    }

    console.log('\n✅ Manual cleanup complete!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

main();
