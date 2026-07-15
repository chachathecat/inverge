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
    const accuracyDetails = page.locator('details[data-s232e3-answer-review-optional]');
    await expect(accuracyDetails).not.toHaveAttribute('open', '');
    await expect(accuracyDetails.getByTestId('answer-review-problem-input')).toBeHidden();
    await expect(accuracyDetails.getByTestId('answer-review-reference-input')).toBeHidden();
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
    const accuracyDetails = page.locator('details[data-s232e3-answer-review-optional]');
    await accuracyDetails.locator('summary').filter({ hasText: '정확도 높이기 (선택)' }).click();
    await expect(accuracyDetails).toHaveAttribute('open', '');
    await page.getByTestId('answer-review-problem-input').fill('문제/사례 입력 smoke');
    await page.getByTestId('answer-review-my-answer-input').fill('내 답안 입력 smoke');
    await page.locator('summary').filter({ hasText: '참고 정리/메모 입력 (선택)' }).click();
    await page.getByTestId('answer-review-reference-input').fill('참고 정리 입력 smoke');

    await page.getByTestId('answer-review-start').click();
    await expect(page.getByRole('heading', { name: '가장 큰 간극부터 확인', level: 2 })).toBeFocused();
    await expect(page.getByTestId('answer-review-build-feedback')).toBeVisible();
    await expect(page.getByRole('button', { name: '보강 문단 정리', exact: true })).toHaveCount(1);
    await page.getByTestId('answer-review-build-feedback').click();
    await expect(page.getByRole('heading', { name: '보강 문단 정리', level: 2 })).toBeFocused();
    await expect(page.getByRole('button', { name: '정리 내용 복사', exact: true })).toBeVisible();
  });

  test('/answer-review preserves Problem Snap handoff values and notice', async ({ page }) => {
    const handoff = {
      source: 'problem-snap',
      examMode: 'second',
      subject: '감정평가실무',
      problemText: 'Problem Snap 문제 원문',
      retryMemo: 'Problem Snap에서 다시 쓴 답안',
      nextPracticeAction: '수익환원식의 변수와 단위를 한 문단으로 보강',
    };
    await page.addInitScript((value) => {
      window.sessionStorage.setItem('inverge.problemSnap.answerReviewHandoff', JSON.stringify(value));
    }, handoff);
    await page.route('**/api/answer-review/structure', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          draft: {
            questionSummary: 'Problem Snap handoff smoke',
            coreConcepts: ['수익환원식'],
            strengths: ['다시 쓴 답안을 보존했습니다.'],
            missingIssueCandidates: ['변수와 단위 연결'],
            weakLogicPoint: '변수 설명이 짧음',
            weakParagraphPoint: '단위 연결이 약함',
            rewriteTarget: '변수와 단위를 한 문단으로 연결',
            rewriteDraftSuggestion: '변수의 의미와 단위를 차례로 연결합니다.',
            nextAction: '한 문단을 다시 작성합니다.',
          },
        }),
      });
    });

    await page.goto('/answer-review?mode=second');
    await expect(page.getByText('Problem Snap에서 다시 푼 답안을 불러왔습니다.', { exact: true })).toBeVisible();
    await expect(page.getByTestId('answer-review-my-answer-input')).toHaveValue(handoff.retryMemo);
    await expect(page.getByRole('combobox')).toHaveValue(handoff.subject);

    const accuracyDetails = page.locator('details[data-s232e3-answer-review-optional]');
    await expect(accuracyDetails).not.toHaveAttribute('open', '');
    await accuracyDetails.locator('summary').filter({ hasText: '정확도 높이기 (선택)' }).click();
    await expect(accuracyDetails.getByTestId('answer-review-problem-input')).toHaveValue(handoff.problemText);
    expect(await page.evaluate(() => window.sessionStorage.getItem('inverge.problemSnap.answerReviewHandoff'))).toBeNull();

    await page.getByTestId('answer-review-start').click();
    await page.getByTestId('answer-review-build-feedback').click();
    await expect(page.getByPlaceholder('예: 처분 근거 조문 제시가 누락되어 논증 연결이 약함')).toHaveValue(handoff.nextPracticeAction);
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
    const undersizedTargets = await page.locator('a[href], button, summary, input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), select, textarea').evaluateAll((elements) =>
      elements.flatMap((element) => {
        const htmlElement = element as HTMLElement;
        const style = getComputedStyle(htmlElement);
        const rect = htmlElement.getBoundingClientRect();
        const root = htmlElement.getRootNode();
        const insideNextDevTools = root instanceof ShadowRoot && root.host.matches('nextjs-portal');
        if (insideNextDevTools) return [];
        if (rect.width === 0 || rect.height === 0 || style.display === 'none' || style.visibility === 'hidden') return [];
        const inlineProseLink = htmlElement.matches('a[href]') && style.display === 'inline' && htmlElement.closest('p, li') !== null;
        if (inlineProseLink || (rect.width >= 44 && rect.height >= 44)) return [];
        return [{ tag: htmlElement.tagName.toLowerCase(), width: rect.width, height: rect.height }];
      }),
    );
    expect(undersizedTargets).toEqual([]);
    expect(runtimeErrors).toEqual([]);
  });
});
