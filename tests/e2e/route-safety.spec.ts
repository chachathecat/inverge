import { expect, test } from '@playwright/test';

test('route safety: blocked or notFound paths do not expose learner UI', async ({ page }) => {
  for (const path of ['/instructor', '/studio', '/exams/actuary-first', '/exams/actuary-second']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByText('시작하기')).toHaveCount(0);
    await expect(page.getByText('감정평가사 1차')).toHaveCount(0);
    await expect(page.getByText('감정평가사 2차')).toHaveCount(0);
  }
});
