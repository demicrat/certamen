import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());

async function player(browser: Browser, name: string) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const user = { id: 'test-' + name, username: name, email: name + '@example.test', profile: 'default', division: 'HS2', specialties: ['history'], lessons: [], level: 3, xp: 42, coins: 25, bio: 'Ready for the next round.' };
  const token = await encode({ secret: process.env.NEXTAUTH_SECRET!, token: user });
  await context.addCookies([{ name: 'next-auth.session-token', value: token, url: 'http://localhost:3100', httpOnly: true, sameSite: 'Lax' }]);
  // Profile fixtures avoid writes/reads against real Firebase accounts. The
  // NextAuth session, rendered routes and multiplayer transport remain real.
  let progress = 'unstarted';
  await context.route('**/api/user/**', route => {
    if (route.request().url().includes('/progress')) {
      if (route.request().method() === 'PUT') progress = route.request().postDataJSON().status;
      return route.fulfill({ json: { status: progress } });
    }
    return route.fulfill({ json: user });
  });
  return { context, page: await context.newPage() };
}
async function noOverflow(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true); }

test('every page renders on desktop and mobile', async ({ browser, page }) => {
  const failures: string[] = []; page.on('pageerror', e => failures.push(e.message));
  for (const path of ['/', '/auth/signin', '/auth/register', '/not-a-page']) {
    await page.goto(path); await expect(page.locator('h1').first()).toBeVisible(); await noOverflow(page);
    await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
    await page.screenshot({ path: 'test-results/' + (path === '/' ? 'home' : path.replaceAll('/', '-')) + '-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1050 });
  }
  await page.goto('/'); await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  const person = await player(browser, 'Athena'); person.page.on('pageerror', e => failures.push(e.message));
  try {
    for (const path of ['/play', '/study', '/study/history', '/study/myth', '/study/history/1', '/settings']) {
      await person.page.goto(path); await expect(person.page.locator('h1').first()).toBeVisible();
      if (path === '/study/history/1') await expect(person.page.locator('.lesson-content')).toBeVisible();
      await noOverflow(person.page); await person.page.screenshot({ path: 'test-results/' + path.replaceAll('/', '-') + '-desktop.png', fullPage: true });
      await person.page.setViewportSize({ width: 390, height: 844 }); await noOverflow(person.page);
      await person.page.screenshot({ path: 'test-results/' + path.replaceAll('/', '-') + '-mobile.png', fullPage: true });
      await person.page.setViewportSize({ width: 1440, height: 1050 });
    }
    await person.page.getByRole('button', { name: 'Account settings', exact: true }).click();
    await expect(person.page.getByRole('heading', { name: 'Account Information' })).toBeVisible();
    await person.page.setViewportSize({ width: 390, height: 844 }); await noOverflow(person.page);
    await person.page.screenshot({ path: 'test-results/settings-account-mobile.png', fullPage: true });
    await person.page.goto('/study/history/1'); await expect(person.page.getByLabel('Lesson progress')).toBeVisible();
    await person.page.getByLabel('Lesson progress').selectOption('complete'); await expect(person.page.getByLabel('Lesson progress')).toHaveValue('complete');
    expect(failures).toEqual([]);
  } finally { await person.context.close(); }
});

test('real host and two players complete a match using keyboard and touch buzzing', async ({ browser }) => {
  const contexts: BrowserContext[] = [];
  const errors: string[] = [];
  try {
    const host = await player(browser, 'Moderator'); const a = await player(browser, 'Athena'); const b = await player(browser, 'Apollo');
    contexts.push(host.context, a.context, b.context);
    for (const person of [host, a, b]) person.page.on('pageerror', e => errors.push(e.message));
    await host.page.goto('/play'); await host.page.getByRole('button', { name: 'Create a competition' }).click();
    await expect(host.page.getByRole('heading', { name: 'The arena is yours.' })).toBeVisible();
    const code = new URL(host.page.url()).pathname.split('/').pop()!;
    for (const person of [a, b]) {
      await person.page.goto('/play'); await person.page.getByLabel('ROOM CODE', { exact: true }).fill(code);
      await person.page.getByRole('button', { name: 'Join competition', exact: true }).click();
      await expect(person.page.getByRole('heading', { name: 'The arena is yours.' })).toBeVisible();
    }
    await host.page.getByLabel('Questions', { exact: true }).selectOption('1');
    await host.page.getByLabel('Reading pace').selectOption('500');
    await host.page.screenshot({ path: 'test-results/lobby-desktop.png', fullPage: true });
    await host.page.getByRole('button', { name: 'Start competition' }).click();
    await expect(a.page.getByRole('button', { name: /BUZZ IN/ })).toBeEnabled();
    await expect(a.page.locator('.question-text')).not.toContainText('The first clue');
    await a.page.locator('h1').click(); await a.page.keyboard.press('Space');
    await expect(a.page.getByLabel('Your answer', { exact: true })).toBeVisible();
    await expect(b.page.getByRole('button', { name: /BUZZ IN/ })).toBeDisabled();
    const paused = await a.page.locator('.question-text').textContent();
    await a.page.getByLabel('Your answer', { exact: true }).fill('an answer with spaces');
    await a.page.keyboard.press('Enter');
    await expect(host.page.getByText('answered: “an answer with spaces”', { exact: false })).toBeVisible();
    expect(await a.page.locator('.question-text').textContent()).toBe(paused);
    await host.page.screenshot({ path: 'test-results/moderator-paused.png', fullPage: true });
    await host.page.getByRole('button', { name: 'Incorrect · resume' }).click();
    await expect(a.page.getByRole('button', { name: /Your attempt is complete/ })).toBeDisabled();
    await b.page.setViewportSize({ width: 390, height: 844 });
    await b.page.getByRole('button', { name: /BUZZ IN/ }).click();
    await expect(b.page.getByLabel('Your answer', { exact: true })).toBeVisible();
    await b.page.getByLabel('Your answer', { exact: true }).fill('Correct answer'); await b.page.keyboard.press('Enter');
    await host.page.getByRole('button', { name: 'Correct +10' }).click();
    await expect(b.page.locator('.answer-reveal')).toBeVisible();
    await noOverflow(b.page); await b.page.screenshot({ path: 'test-results/arena-mobile.png', fullPage: true });
    await b.page.reload(); await expect(b.page.locator('.answer-reveal')).toBeVisible();
    await host.page.getByRole('button', { name: 'Show final standings' }).click();
    await expect(a.page.getByRole('heading', { name: 'Take a bow, Apollo!' })).toBeVisible();
    await expect(host.page.locator('.results-list').getByText('10', { exact: false })).toBeVisible();
    await host.page.screenshot({ path: 'test-results/results-desktop.png', fullPage: true });
    await host.page.getByRole('button', { name: 'Run it back' }).click();
    await expect(a.page.getByRole('heading', { name: 'The arena is yours.' })).toBeVisible();
    await host.page.getByRole('button', { name: 'Close room', exact: true }).click();
    await expect(a.page.getByRole('heading', { name: 'See you next round.' })).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(context => context.close())); }
});
