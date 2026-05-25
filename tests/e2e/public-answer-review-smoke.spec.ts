import { expect, test } from '@playwright/test';

test.describe('public answer-review smoke', () => {
  test('/ opens', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  test('/exams opens', async ({ page }) => {
    await page.goto('/exams');
    await expect(page).toHaveURL('/exams');
  });

  test('/answer-review opens', async ({ page }) => {
    await page.goto('/answer-review');
    await expect(page).toHaveURL('/answer-review');
    await expect(page.getByTestId('answer-review-start')).toBeVisible();
  });

  test('/answer-review text-only smoke', async ({ page }) => {
    await page.route('**/api/answer-review/structure', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          draft: {
            questionSummary: '보상법규상 손실보상 요건 정리 문제',
            coreConcepts: ['손실보상 요건', '공익사업 요건'],
            strengths: ['사실관계 정리 순서가 안정적입니다.'],
            missingIssueCandidates: ['공익사업 해당성 검토가 누락됨'],
            weakLogicPoint: '요건과 사실 대응이 약함',
            weakParagraphPoint: '결론 문장이 추상적임',
            rewriteTarget: '요건-사실-결론을 한 문단으로 연결',
            rewriteDraftSuggestion: '공익사업 해당성 요건을 먼저 제시하고 사실관계를 대응해 결론을 명확히 작성합니다.',
            nextAction: '누락 논점을 반영해 한 문단을 다시 작성합니다.',
          },
        }),
      });
    });

    await page.goto('/answer-review');
    await page.getByTestId('answer-review-problem-input').fill('문제/사례 입력 smoke');
    await page.getByTestId('answer-review-my-answer-input').fill('내 답안 입력 smoke');
    await page.getByTestId('answer-review-reference-input').fill('기준답안 입력 smoke');

    await page.getByTestId('answer-review-start').click();
    await expect(page.getByTestId('answer-review-build-feedback')).toBeVisible();
    await page.getByTestId('answer-review-build-feedback').click();
    await expect(page.getByRole('button', { name: '피드백 초안 복사' })).toBeVisible();
  });
});
