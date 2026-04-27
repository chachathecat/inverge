import { expect, test } from '@playwright/test';

const unsupportedExams = ['보험계리사', 'CPA', '세무사', 'TOEFL', 'SAT'];

test('public landing loads and 시작하기 CTA exists', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: '시작하기' }).first()).toBeVisible();
});

test('/exams exposes 1차/2차/답안 검토실 cards only', async ({ page }) => {
  await page.goto('/exams');
  await expect(page.getByTestId('exam-card-first')).toBeVisible();
  await expect(page.getByTestId('exam-card-second')).toBeVisible();
  await expect(page.getByTestId('exam-card-answer-review')).toBeVisible();

  for (const exam of unsupportedExams) {
    await expect(page.getByText(exam)).toHaveCount(0);
  }
});

test('entry cards route safely by track', async ({ page }) => {
  await page.goto('/exams');

  await page.getByTestId('exam-card-first').getByRole('link', { name: '이 트랙으로 시작' }).click();
  await expect(page).toHaveURL(/\/(app\?mode=first|login\?returnTo=.*%2Fapp%3Fmode%3Dfirst)/);

  await page.goto('/exams');
  await page.getByTestId('exam-card-second').getByRole('link', { name: '이 트랙으로 시작' }).click();
  await expect(page).toHaveURL(/\/(app\?mode=second|login\?returnTo=.*%2Fapp%3Fmode%3Dsecond)/);
});

test('answer review card routes to informational-only page', async ({ page }) => {
  await page.goto('/exams');
  await page.getByTestId('exam-card-answer-review').getByRole('link', { name: '베타 준비 중' }).click();
  await expect(page).toHaveURL('/answer-review');
  await expect(page.getByRole('heading', { name: '답안 검토실은 운영자용 베타로 준비 중입니다.' })).toBeVisible();
  await expect(page.getByText('최종 채점이나 합격 판정을 제공하지 않습니다.')).toBeVisible();
  await expect(page.locator('input[type=\"file\"]')).toHaveCount(0);
  await expect(page.locator('button[type=\"submit\"]')).toHaveCount(0);
});
