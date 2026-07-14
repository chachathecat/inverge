import AxeBuilder from '@axe-core/playwright';
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
    await expect(page).toHaveURL('/answer-review?mode=second');
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
    await page.locator('summary').filter({ hasText: '참고 정리/메모 입력 (선택)' }).click();
    await page.getByTestId('answer-review-reference-input').fill('참고 정리 입력 smoke');

    await page.getByTestId('answer-review-start').click();
    await expect(page.getByTestId('answer-review-build-feedback')).toBeVisible();
    await page.getByTestId('answer-review-build-feedback').click();
    await expect(page.getByRole('button', { name: '정리 내용 복사', exact: true })).toBeVisible();
  });

  test('/answer-review keeps the public S231C accessibility contract', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(message.text());
    });
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.addInitScript(() => window.localStorage.setItem('inverge:theme-mode', 'dark'));
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/answer-review?mode=second');

    await expect(page.locator('main#answer-review-main')).toHaveCount(1);
    await expect(page.locator('h1', { hasText: '답안 검토' })).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.locator('html').evaluate((element) => getComputedStyle(element).colorScheme)).toBe('light');

    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#answer-review-main"]');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#answer-review-main')).toBeFocused();

    const blocking = (await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()).violations.filter((violation) =>
        violation.impact === 'critical' || violation.impact === 'serious',
      );
    expect(blocking.map(({ id, impact, nodes }) => ({ id, impact, nodeCount: nodes.length }))).toEqual([]);

    const layout = await page.evaluate(() => ({
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    }));
    expect(layout).toEqual({ overflow: 0, reducedMotion: true, scrollBehavior: 'auto' });
    expect(runtimeErrors).toEqual([]);
  });
});
