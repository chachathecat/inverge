import { expect, test } from '@playwright/test';

const unsupportedExams = ['보험계리사', 'CPA', '세무사', 'TOEFL', 'SAT'];

test('public landing loads and capture CTA exists', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: '답안 1개 올리기' }).first()).toBeVisible();
});

test('/exams exposes second-round answer training card only', async ({ page }) => {
  await page.goto('/exams');
  await expect(page.getByTestId('exam-card-second')).toBeVisible();
  await expect(page.getByText('감정평가사 2차 답안 훈련')).toBeVisible();
  await expect(page.getByText('답안 검토실')).toHaveCount(0);

  for (const exam of unsupportedExams) {
    await expect(page.getByText(exam)).toHaveCount(0);
  }
});

test('entry cards route safely by track', async ({ page }) => {
  await page.goto('/exams');

  await page.getByTestId('exam-card-second').getByRole('link', { name: '2차 답안 올리기' }).click();
  await expect(page).toHaveURL(/\/(app\/capture\?mode=second|login\?returnTo=.*%2Fapp%2Fcapture%3Fmode%3Dsecond)/);
});
