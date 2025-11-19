import { chromium } from '@playwright/test';
import { getBypassHeaders } from '../tests/helpers/api.helper';

async function check() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: 'http://localhost:8000' });
  const page = await context.newPage();

  await page.goto('/login');
  await page.fill('input[name="email"]', 'playwright-test@entoo.cz');
  await page.fill('input[name="password"]', 'password12*');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });

  const token = await page.evaluate(() => localStorage.getItem('token'));

  // Check favorites
  const favResponse = await context.request.get('http://localhost:8000/api/favorites', {
    headers: { 'Authorization': `Bearer ${token}`, ...getBypassHeaders() },
  });
  const favData = await favResponse.json();
  console.log(`\nFavorites: ${favData.data?.length || 0}`);
  favData.data?.forEach((f: any) => console.log(`  - "${f.subject_name?.substring(0, 70)}"`));

  // Check profiles
  const profResponse = await context.request.get('http://localhost:8000/api/subject-profiles', {
    headers: { ...getBypassHeaders() },
  });
  const profData = await profResponse.json();
  console.log(`\nProfiles: ${profData.data?.length || 0}`);
  profData.data?.forEach((p: any) => console.log(`  - "${p.subject_name?.substring(0, 70)}"`));

  await browser.close();
}

check();
