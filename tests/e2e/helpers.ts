import { expect, type Page, type TestInfo } from '@playwright/test';

export const authEmail = process.env.E2E_USER_EMAIL;
export const authPassword = process.env.E2E_USER_PASSWORD;
export const hasAuthEnv = Boolean(authEmail && authPassword);

export function skipIfMissingAuth(testInfo: TestInfo) {
  if (!hasAuthEnv) {
    testInfo.skip('Skipping authenticated learner smoke tests: E2E_USER_EMAIL or E2E_USER_PASSWORD is not set.');
  }
}

export async function login(page: Page) {
  if (!authEmail || !authPassword) {
    throw new Error('Missing E2E credentials. Set E2E_USER_EMAIL and E2E_USER_PASSWORD.');
  }

  await page.goto('/login');
  await page.getByLabel('이메일').fill(authEmail);
  await page.getByLabel('비밀번호').fill(authPassword);
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/\/app/);
}
