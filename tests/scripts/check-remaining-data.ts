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

  // Check files
  const filesResponse = await context.request.get('http://localhost:8000/api/files', {
    headers: { 'Authorization': `Bearer ${token}`, ...getBypassHeaders() },
  });
  const filesData = await filesResponse.json();
  const files = filesData.data || [];

  console.log(`\nTotal files: ${files.length}`);

  // Check for any test subjects
  const testSubjectPatterns = [
    /^Test Subject/i,
    /^<img src/i,
    /alert\(/i,
    /<script>/i,
    /^">/i,
    /TestSubject$/i,
    /XSS/i,
  ];

  const testSubjects = new Set<string>();
  files.forEach((f: any) => {
    const subjectName = f.subject_name || '';
    const isTestSubject = testSubjectPatterns.some(pattern => pattern.test(subjectName));
    if (isTestSubject) {
      testSubjects.add(subjectName);
    }
  });

  console.log(`\nTest subjects remaining: ${testSubjects.size}`);
  if (testSubjects.size > 0) {
    console.log('Test subjects:');
    Array.from(testSubjects).forEach(name => console.log(`  - "${name.substring(0, 70)}"`));
  }

  // Check subjects
  const subjectsResponse = await context.request.get('http://localhost:8000/api/subjects', {
    headers: { ...getBypassHeaders() },
  });
  const subjectsData = await subjectsResponse.json();
  const subjects = subjectsData.data || [];

  console.log(`\nTotal subjects: ${subjects.length}`);
  const testSubjectsFromSubjectsAPI = subjects.filter((s: any) => {
    const name = s.name || '';
    return testSubjectPatterns.some(pattern => pattern.test(name));
  });
  console.log(`Test subjects from /api/subjects: ${testSubjectsFromSubjectsAPI.length}`);

  await browser.close();
}

check();
