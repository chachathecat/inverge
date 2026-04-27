import { expect, test } from '@playwright/test';

import { login, skipIfMissingAuth } from './helpers';

test.describe('authenticated learner smoke', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    skipIfMissingAuth(testInfo);
    await login(page);
  });

  test('1차 flow smoke', async ({ page }) => {
    await page.goto('/app?mode=first');
    await expect(page.getByRole('button', { name: /세트 풀이 시작|오늘 최우선 작업 시작/ })).toBeVisible();
    await expect(page.getByLabel('오늘 공부할 과목')).toBeVisible();
    await expect(page.getByLabel('감정평가사 단계 선택')).toHaveCount(0);
    await page.getByLabel('오늘 공부할 과목').selectOption('회계학');

    await page.goto('/app/sets?mode=first&subject=회계학');
    await expect(page.getByRole('heading', { name: '1차 세트 풀이' })).toBeVisible();
    await expect(page.getByLabel('과목').first()).toHaveValue('회계학');

    const subjectSelect = page.getByLabel('과목').first();
    for (const subject of ['민법', '경제학원론', '부동산학원론', '감정평가관계법규', '회계학']) {
      await expect(subjectSelect.locator(`option:has-text("${subject}")`)).toHaveCount(1);
    }

    await page.getByLabel('세트 제목/출처').fill(`E2E 스모크 세트 ${Date.now()}`);
    await page.getByLabel('문항 수').fill('3');
    await page.getByRole('button', { name: '다음: 답 입력' }).click();

    await page.getByPlaceholder('내 답: 1 3 2 4 5').fill('1 2 3');
    await page.getByPlaceholder('정답: 1 4 2 4 3').fill('1 4 5');
    await page.getByRole('button', { name: '입력값 행에 반영' }).click();
    await page.getByRole('button', { name: '채점하고 결과 보기' }).click();
    await page.getByRole('button', { name: '다음: 오답 이유 입력' }).click();

    const firstWrongDetail = page.getByTestId('first-set-wrong-detail-0');
    const secondWrongDetail = page.getByTestId('first-set-wrong-detail-1');

    await firstWrongDetail.getByRole('button', { name: '개념 부족' }).click();
    await firstWrongDetail.locator('textarea').fill('핵심 개념 정의를 먼저 떠올려야 합니다.');

    await secondWrongDetail.getByRole('button', { name: '계산 실수' }).click();
    await secondWrongDetail.locator('textarea').fill('계산 전 조건을 먼저 적고 검산합니다.');

    await page.getByRole('button', { name: '재시도 큐 자동 생성' }).click();

    const doneSummary = page.getByTestId('first-set-solving-done');
    const saveError = page.getByTestId('first-set-solving-error');
    const saveState = await Promise.race([
      doneSummary.waitFor({ state: 'visible', timeout: 45_000 }).then(() => 'done' as const),
      saveError.waitFor({ state: 'visible', timeout: 45_000 }).then(() => 'error' as const),
    ]);
    if (saveState === 'error') {
      const errorText = (await saveError.textContent())?.trim() ?? '(오류 메시지 없음)';
      throw new Error(`1차 set-solving 저장 실패: ${errorText}`);
    }

    await expect(doneSummary).toBeVisible();
    await page.getByRole('button', { name: '다시 볼 항목 확인' }).click();
    await expect(page).toHaveURL(/\/app\/review\?mode=first/);

    await page.goto('/app/study-log?mode=first&subject=회계학');
    await page.getByLabel('공부 범위 / 출처').fill(`E2E taxonomy log ${Date.now()}`);
    await page.getByLabel('이해가 어려웠던 점').fill('재고자산 저가법 계산에서 기준이 흔들렸습니다.');
    await page.getByLabel('다시 볼 범위').fill('재고자산 저가법 기준을 다시 확인합니다.');
    await page.getByRole('button', { name: '오늘 공부 기록 저장' }).click();
    await expect(page).toHaveURL(/\/app\?mode=first/);
    await expect(page.getByRole('button', { name: /세트 풀이 시작|오늘 최우선 작업 시작/ })).toBeVisible();
  });

  test('2차 flow smoke', async ({ page }) => {
    await page.goto('/app?mode=second');
    await expect(page.getByRole('button', { name: /오늘 최우선 작업 시작/ })).toBeVisible();
    await expect(page.getByLabel('감정평가사 단계 선택')).toHaveCount(0);

    await page.goto('/app/write?mode=second');
    await expect(page.getByRole('heading', { name: '2차 답안 작성 워크스페이스' })).toBeVisible();

    const subjectSelect = page.locator('select').first();
    for (const subject of ['감정평가실무', '감정평가이론', '감정평가 및 보상법규']) {
      await expect(subjectSelect.locator(`option:has-text("${subject}")`)).toHaveCount(1);
    }

    await page.getByLabel('쟁점 회상').fill('쟁점1 사실관계 정리, 쟁점2 법적요건 검토, 쟁점3 결론 도출 순서로 작성합니다.');
    await page.getByRole('button', { name: '다음: 목차 작성' }).click();

    await page.getByLabel('목차 초안').fill('I. 쟁점 정리 II. 법리 검토 III. 사실 적용 IV. 결론');
    await page.getByRole('button', { name: '다음: 내 답안 작성' }).click();

    await page.getByLabel('내 답안').fill('쟁점별로 요건과 사실관계를 대응시켜 결론을 작성했습니다.');
    await page.getByRole('button', { name: '다음: 기준답안/해설 입력' }).click();

    await page.getByLabel('기준 답안 요약').fill('기준답안은 요건 분해와 사실 적용을 더 명확히 제시합니다.');
    await page.getByRole('button', { name: '다음: 가장 큰 간극 1개' }).click();

    await page.getByLabel('보강할 논점 1개').fill('요건-사실 대응 문장을 각 소결론마다 명시하지 못함.');
    await page.getByRole('button', { name: '다음: 문단 다시쓰기' }).click();

    const saveButton = page.getByTestId('second-write-submit');
    await expect(saveButton).toBeEnabled();
    await page.getByTestId('second-write-final-textarea').fill('각 쟁점에서 요건을 먼저 제시하고 사실을 대응한 뒤 소결론을 명시해 작성합니다.');
    await saveButton.click();

    const doneSummary = page.getByTestId('second-item-completion-summary');
    const saveError = page.getByTestId('second-write-error');
    const saveState = await Promise.race([
      doneSummary.waitFor({ state: 'visible', timeout: 45_000 }).then(() => 'done' as const),
      saveError.waitFor({ state: 'visible', timeout: 45_000 }).then(() => 'error' as const),
      page.waitForURL(/\/app\/items\/.+\?mode=second/, { timeout: 45_000 }).then(() => 'redirect' as const),
    ]);
    if (saveState === 'error') {
      const errorText = (await saveError.textContent())?.trim() ?? '(오류 메시지 없음)';
      throw new Error(`2차 writing 저장 실패: ${errorText}`);
    }

    if (saveState === 'redirect') {
      await expect(doneSummary).toBeVisible({ timeout: 45_000 });
    }

    await expect(page.getByText('오늘 작업은 여기까지입니다.')).toBeVisible();
    await expect(page.getByRole('link', { name: '다른 답안 작업 보기' })).toBeVisible();
  });
});
