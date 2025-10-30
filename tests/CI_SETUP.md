# CI/CD Setup for GUI Tests

## Current CI Configuration

The GitHub Actions workflow currently runs:
- ✅ PHPUnit backend tests
- ✅ Playwright performance tests
- ✅ Playwright caching tests
- ✅ PDF parsing tests
- ⚠️ **GUI tests are SKIPPED** (require authentication)

## Why GUI Tests Are Skipped in CI

GUI tests require:
1. **Authenticated user session** - Tests use `setupAuth()` which needs valid credentials
2. **Test user in database** - User with `test@entoo.cz` email must exist
3. **Running application** - http://localhost:8000 must be accessible
4. **Database with test data** - Subjects and files for testing

## Enabling GUI Tests in CI

### Option 1: Add Test User Setup to Workflow

Modify `.github/workflows/laravel-tests.yml`:

```yaml
- name: Create test user
  run: |
    docker exec php php artisan tinker --execute="
      User::firstOrCreate(
        ['email' => 'test@entoo.cz'],
        ['name' => 'Test User', 'password' => bcrypt('password123')]
      );
    "

- name: Run All Playwright Tests
  working-directory: ./tests
  run: |
    npm install
    npx playwright install chromium
    npx playwright test --reporter=list
```

### Option 2: Use Test Database Seeder

Create `database/seeders/TestUserSeeder.php`:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class TestUserSeeder extends Seeder
{
    public function run()
    {
        User::firstOrCreate(
            ['email' => 'test@entoo.cz'],
            [
                'name' => 'Test User',
                'password' => bcrypt('password123'),
            ]
        );
    }
}
```

Run in workflow:
```yaml
- name: Seed test data
  run: docker exec php php artisan db:seed --class=TestUserSeeder
```

### Option 3: Mock Authentication in Tests

Modify tests to detect CI environment and skip authentication:

```typescript
test.beforeEach(async ({ page }) => {
  if (process.env.CI) {
    // Skip auth tests in CI
    test.skip();
  } else {
    await setupAuth(page);
  }
});
```

## Current Test Coverage in CI

| Test Suite | Status | Count | Description |
|------------|--------|-------|-------------|
| PHPUnit Backend | ✅ Running | ~15 | Laravel backend tests |
| Performance Tests | ✅ Running | ~8 | API performance benchmarks |
| Caching Tests | ✅ Running | ~6 | Redis cache functionality |
| PDF Parsing | ✅ Running | ~6 | PDF text extraction |
| **GUI Tests** | ⚠️ Skipped | **71** | **Authentication, favorites, file upload, search, profiles, dashboard** |

## Running GUI Tests Locally

All 71 GUI tests work perfectly in local development:

```bash
# Ensure Docker services are running
docker-compose up -d

# Run GUI tests
cd tests
npm install
npx playwright install chromium
npm test tests/gui/

# Or run specific suite
npm test tests/gui/auth.spec.ts
npm test tests/gui/favorites.spec.ts
```

## Recommendation

For production-quality CI:
1. **Add test user seeder to workflow** (Option 2)
2. **Run full test suite including GUI tests**
3. **Upload test artifacts** (screenshots, videos, reports)

For current setup:
- ✅ Critical non-GUI tests are covered
- ✅ No false negatives (tests that need auth are skipped)
- ✅ Local development has full test coverage
- ⚠️ GUI regressions won't be caught in CI

## Future Enhancements

- Add test user creation to CI workflow
- Add test data seeding for subjects/files
- Enable parallel test execution
- Add visual regression testing
- Add API contract testing
