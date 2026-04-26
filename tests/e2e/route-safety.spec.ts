import { expect, test } from '@playwright/test';

const forbiddenSurfaceText = [
  '학원용 답안 운영 콘솔',
  'instructor',
  'studio',
  '보험계리사',
  'CPA',
  '세무사',
  'TOEFL',
  'SAT',
];

test('route safety: blocked or notFound paths do not expose unsupported or instructor surfaces', async ({ page }) => {
  for (const path of ['/instructor', '/studio', '/exams/actuary-first', '/exams/actuary-second']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);

    for (const text of forbiddenSurfaceText) {
      await expect(page.getByText(text)).toHaveCount(0);
    }
  }
});
