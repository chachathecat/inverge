import { expect, test } from '@playwright/test';

const unsupportedExams = ['보험계리사', 'CPA', '세무사', 'TOEFL', 'SAT'];

test('public landing loads and 시작하기 CTA exists', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: '시작하기' }).first()).toBeVisible();
});

test('/exams only exposes appraisal 1차/2차', async ({ page }) => {
  await page.goto('/exams');
  await expect(page.getByTestId('exam-card-first')).toBeVisible();
  await expect(page.getByTestId('exam-card-second')).toBeVisible();

  for (const exam of unsupportedExams) {
    await expect(page.getByText(exam)).toHaveCount(0);
  }
});
