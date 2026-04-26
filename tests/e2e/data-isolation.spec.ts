import { expect, test, type Page } from '@playwright/test';

const userAEmail = process.env.E2E_USER_A_EMAIL;
const userAPassword = process.env.E2E_USER_A_PASSWORD;
const userBEmail = process.env.E2E_USER_B_EMAIL;
const userBPassword = process.env.E2E_USER_B_PASSWORD;

const hasIsolationEnv = Boolean(
  userAEmail && userAPassword && userBEmail && userBPassword,
);

async function loginWithCredentials(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/app/);
}

async function logout(page: Page) {
  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function createFirstSetRecord(page: Page, title: string) {
  await page.goto('/app/sets?mode=first');
  await expect(page.getByRole('heading', { name: '1차 세트 풀이' })).toBeVisible();

  await page.getByLabel('세트 제목/출처').fill(title);
  await page.getByLabel('문항 수').fill('2');
  await page.getByRole('button', { name: '다음: 답 입력' }).click();

  await page.getByPlaceholder('내 답: 1 3 2 4 5').fill('1 2');
  await page.getByPlaceholder('정답: 1 4 2 4 3').fill('1 4');
  await page.getByRole('button', { name: '입력값 행에 반영' }).click();
  await page.getByRole('button', { name: '채점하고 결과 보기' }).click();
  await page.getByRole('button', { name: '다음: 오답 이유 입력' }).click();

  const firstWrongDetail = page.getByTestId('first-set-wrong-detail-0');
  await firstWrongDetail.getByRole('button', { name: '개념 부족' }).click();
  await firstWrongDetail.locator('textarea').fill('개념을 먼저 회상합니다.');

  await page.getByRole('button', { name: '재시도 큐 자동 생성' }).click();

  const doneSummary = page.getByTestId('first-set-solving-done');
  const saveError = page.getByTestId('first-set-solving-error');
  const saveState = await Promise.race([
    doneSummary.waitFor({ state: 'visible', timeout: 45_000 }).then(() => 'done' as const),
    saveError.waitFor({ state: 'visible', timeout: 45_000 }).then(() => 'error' as const),
  ]);

  if (saveState === 'error') {
    const errorText = (await saveError.textContent())?.trim() ?? '(오류 메시지 없음)';
    throw new Error(`data-isolation 저장 실패: ${errorText}`);
  }

  await page.goto('/app/review?mode=first');
  await expect(page.getByRole('heading', { name: '오늘 다시 볼 항목' })).toBeVisible();
  await expect(page.getByText(title)).toHaveCount(1);
}

async function readItemList(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch('/api/os/items?limit=100', { credentials: 'include' });
    const payload = (await response.json().catch(() => ({}))) as {
      items?: Array<{ id?: string; itemId?: string; problemTitle?: string; sourceLabel?: string }>;
    };
    return {
      status: response.status,
      items: payload.items ?? [],
    };
  });
}

test('data isolation smoke: User A and User B cannot view each other records', async ({ page }, testInfo) => {
  testInfo.setTimeout(180_000);

  if (!hasIsolationEnv) {
    testInfo.skip(
      'Skipping data isolation smoke: E2E_USER_A_EMAIL, E2E_USER_A_PASSWORD, E2E_USER_B_EMAIL, E2E_USER_B_PASSWORD must all be set.',
    );
  }

  const userATitle = `E2E-Isolation-A-${Date.now()}`;
  const userBTitle = `E2E-Isolation-B-${Date.now()}`;

  await loginWithCredentials(page, userAEmail!, userAPassword!);
  await createFirstSetRecord(page, userATitle);

  const userAList = await readItemList(page);
  expect(userAList.status).toBe(200);
  const userARecord = userAList.items.find(
    (item) => item.problemTitle?.includes(userATitle) || item.sourceLabel?.includes(userATitle),
  );
  expect(userARecord).toBeDefined();
  const userAItemId = userARecord?.id ?? userARecord?.itemId;
  if (!userAItemId) {
    throw new Error('data-isolation: could not resolve User A item id from /api/os/items');
  }

  await logout(page);

  await loginWithCredentials(page, userBEmail!, userBPassword!);
  await page.goto('/app/review?mode=first');
  await expect(page.getByText(userATitle)).toHaveCount(0);

  const userBListBefore = await readItemList(page);
  expect(userBListBefore.status).toBe(200);
  expect(
    userBListBefore.items.some(
      (item) => item.problemTitle?.includes(userATitle) || item.sourceLabel?.includes(userATitle),
    ),
  ).toBe(false);

  const userBViewOfA = await page.evaluate(async (itemId) => {
    const response = await fetch(`/api/os/items/${itemId}`, { credentials: 'include' });
    const payload = (await response.json().catch(() => ({}))) as { detail?: { item?: { problemTitle?: string } } | null };
    return {
      status: response.status,
      revealedTitle: payload.detail?.item?.problemTitle ?? null,
    };
  }, userAItemId);

  expect(
    userBViewOfA.status === 404 ||
      userBViewOfA.status === 401 ||
      userBViewOfA.revealedTitle === null ||
      !userBViewOfA.revealedTitle.includes(userATitle),
  ).toBe(true);

  await createFirstSetRecord(page, userBTitle);
  await logout(page);

  await loginWithCredentials(page, userAEmail!, userAPassword!);
  await page.goto('/app/review?mode=first');
  await expect(page.getByText(userBTitle)).toHaveCount(0);

  const userAListAfter = await readItemList(page);
  expect(userAListAfter.status).toBe(200);
  expect(
    userAListAfter.items.some(
      (item) => item.problemTitle?.includes(userBTitle) || item.sourceLabel?.includes(userBTitle),
    ),
  ).toBe(false);
});
