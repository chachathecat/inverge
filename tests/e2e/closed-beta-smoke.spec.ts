import { expect, test, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';

const authStatePath = process.env.TEST_AUTH_STATE_PATH;
const authEmail = process.env.TEST_USER_EMAIL || process.env.E2E_USER_EMAIL;
const authPassword = process.env.TEST_USER_PASSWORD || process.env.E2E_USER_PASSWORD;
const hasAuthState = Boolean(authStatePath && fs.existsSync(authStatePath));
const hasAuthCredentials = Boolean(authEmail && authPassword);
const hasAuthSignal = Boolean(hasAuthState || authEmail);
const canUseDevSmokeAuth = process.env.DEV_SMOKE_AUTH === "true";

const forbiddenCopy = ['AI 채점', '합격 판정', '점수 보장'];

if (hasAuthState && authStatePath) {
  test.use({ storageState: authStatePath });
}

async function loginIfNeeded(page: Page) {
  if (hasAuthState) return;
  if (!authEmail || !authPassword) return;

  await page.goto('/login');
  await page.getByLabel('이메일').fill(authEmail);
  await page.getByLabel('비밀번호').fill(authPassword);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/(app|onboarding)/);
}

async function ensureAuth(page: Page, testInfo: TestInfo, mode: "first" | "second" = "first") {
  if (!hasAuthSignal && canUseDevSmokeAuth) {
    const response = await page.request.post(`/api/dev/smoke-auth?mode=${mode}`);
    if (!response.ok()) {
      testInfo.skip(`Skipping auth-required smoke: dev smoke auth returned ${response.status()}.`);
    }
    return;
  }

  if (!hasAuthSignal) {
    testInfo.skip("Skipping auth-required smoke: TEST_AUTH_STATE_PATH or TEST_USER_EMAIL is required.");
  }

  if (!hasAuthState && authEmail && !authPassword) {
    testInfo.skip("Skipping auth-required smoke: TEST_USER_PASSWORD is required when TEST_USER_EMAIL is provided.");
  }
}

test.describe('closed beta public route smoke', () => {
  test('/ opens', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  test('/exams opens', async ({ page }) => {
    await page.goto('/exams');
    await expect(page).toHaveURL('/exams');
  });

  test('/answer-review opens with 3-step indicator and no forbidden claims', async ({ page }) => {
    await page.goto('/answer-review');
    await expect(page).toHaveURL('/answer-review');

    await expect(page.getByText('자료 입력')).toBeVisible();
    await expect(page.getByText('검토 결과 확인')).toBeVisible();
    await expect(page.getByText('피드백 초안 정리')).toBeVisible();

    for (const copy of forbiddenCopy) {
      await expect(page.getByText(copy)).toHaveCount(0);
    }
  });
});

test.describe('closed beta answer-review interaction smoke', () => {
  test('text-only flow works with mocked structure response', async ({ page }) => {
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

    await page.getByPlaceholder('문제 요구사항, 사례 조건, 논점 키워드를 입력해 주세요.').fill('문제/사례 입력 smoke');
    await page.getByPlaceholder('초안 텍스트가 있으면 붙여 넣고, 없으면 직접 입력해 주세요.').fill('내 답안 입력 smoke');
    await page.getByPlaceholder('기준답안 또는 기준목차를 텍스트로 붙여 넣어 주세요.').fill('기준답안 입력 smoke');

    await page.getByRole('button', { name: '답안 검토 시작' }).click();
    await expect(page.getByRole('button', { name: '피드백 초안 만들기' })).toBeVisible();
    await expect(page.getByText('가장 큰 간극')).toBeVisible();

    await page.getByRole('button', { name: '피드백 초안 만들기' }).click();
    await expect(page.getByRole('button', { name: '피드백 초안 복사' })).toBeVisible();
  });
});

test.describe('closed beta auth-required route smoke', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await ensureAuth(page, testInfo, "first");
    await loginIfNeeded(page);
  });

  for (const path of [
    '/app?mode=first',
    '/app?mode=second',
    '/app/study-log?mode=first&subject=회계학',
    '/app/write?mode=second',
    '/app/settings?mode=first',
  ]) {
    test(`${path} opens or shows invite notice`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/(app|login|onboarding)/);

      const inviteHeading = page.getByRole('heading', { name: '아직 초대 승인 전입니다.' });
      if ((await inviteHeading.count()) > 0) {
        await expect(inviteHeading).toBeVisible();
        return;
      }

      await expect(page).not.toHaveURL(/\/login/);
    });
  }
});

test.describe('learner core loop browser smoke', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    await ensureAuth(page, testInfo, "first");
    await loginIfNeeded(page);
  });

  test('first-mode capture → save → session completion loop', async ({ page }) => {
    await page.goto('/app?mode=first');
    await expect(page.getByRole('link', { name: '오늘 학습 정리하기' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /\/instructor/i })).toHaveCount(0);

    await page.getByRole('link', { name: '오늘 학습 정리하기' }).first().click();
    await expect(page).toHaveURL(/\/app\/capture\?mode=first/);

    await page.getByLabel('오늘 공부한 과목').selectOption('회계학');
    await page.getByRole('button', { name: '텍스트로 직접 입력' }).click();
    await page.getByLabel('문제 / 상황').fill('정답: 3');
    await page.getByLabel('정답').fill('3');
    await page.getByLabel('내가 고른 답').fill('2');
    await page.getByLabel('실수 원인 분류 (1차)').selectOption('선지 오독');
    await page.getByLabel('회상 한 문장 (해설 전)').fill('정답: 3 / 내 답: 2 / 이유: 선지 오독');
    await page.getByLabel('왜 틀렸는지').fill('선지 오독');

    await page.getByRole('button', { name: /저장하고 오늘 계획에 반영/ }).click();
    await expect(page).toHaveURL(/\/app\/session\?mode=first/);

    await expect(page.getByText('오늘 기록이 저장되었습니다')).toBeVisible();
    await expect(page.getByText('가장 큰 간극')).toBeVisible();
    await expect(page.getByText('다음 행동')).toBeVisible();

    await page.getByRole('button', { name: '지금 5분 다시 풀기' }).click();
    await page.getByRole('button', { name: '시작하기' }).click();
    await page.getByLabel('회상 입력').fill('선지 조건부터 읽고 답을 고르겠습니다.');
    await page.getByRole('button', { name: '완료하고 홈으로' }).click();

    await expect(page.getByText('오늘은 여기까지 해도 됩니다')).toBeVisible();
    await expect(page.getByText('다음 복습')).toBeVisible();
  });

  test('second-mode rewrite loop + learner guardrails', async ({ page }, testInfo) => {
    await ensureAuth(page, testInfo, "second");
    await page.goto('/app?mode=second');
    await expect(page.getByRole('link', { name: '오늘 학습 정리하기' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /\/instructor/i })).toHaveCount(0);

    await page.getByRole('link', { name: '오늘 학습 정리하기' }).first().click();
    await expect(page).toHaveURL(/\/app\/capture\?mode=second/);

    await page.getByLabel('오늘 공부한 과목').selectOption('감정평가이론');
    await page.getByRole('button', { name: '텍스트로 직접 입력' }).click();
    await page.getByLabel('쟁점 회상').fill('쟁점1 요건, 쟁점2 사실, 쟁점3 결론');
    await page.getByRole('button', { name: '다음: 목차 작성' }).click();
    await page.getByLabel('목차 초안').fill('I. 요건 II. 사실 III. 결론');
    await page.getByRole('button', { name: '다음: 내 답안 작성' }).click();
    await page.getByLabel('내 답안').fill('요건과 사실을 연결했지만 결론 문장이 약합니다.');
    await page.getByRole('button', { name: '다음: 기준답안/해설 입력' }).click();
    await page.getByLabel('기준 답안 요약').fill('기준답안은 결론을 더 분명히 씁니다.');
    await page.getByRole('button', { name: '다음: 가장 큰 간극 1개' }).click();
    await page.getByLabel('보강할 논점 1개').fill('결론 문장에서 요건-사실 대응을 명시하지 못함');
    await page.getByRole('button', { name: '다음: 문단 다시쓰기' }).click();
    await page.getByTestId('second-write-final-textarea').fill('요건을 제시하고 사실을 대응해 결론을 명확히 작성합니다.');
    await page.getByRole('button', { name: /저장하고 오늘 계획에 반영/ }).click();

    await expect(page).toHaveURL(/\/app\/session\?mode=second/);
    await expect(page.getByText('오늘 기록이 저장되었습니다')).toBeVisible();

    await page.getByRole('button', { name: '지금 10분 다시 쓰기' }).click();
    await page.getByLabel('다시 쓴 문단').fill('누락 쟁점을 반영해 요건-사실-결론 문장을 다시 작성했습니다.');
    await page.getByRole('button', { name: '완료하고 홈으로' }).click();

    await expect(page.getByText('좋아진 점 1개')).toBeVisible();
    await expect(page.getByText('아직 위험한 점 1개')).toBeVisible();
    await expect(page.getByText('다음 문장 행동 1개')).toBeVisible();
    await expect(page.getByText('점수 판정이 아니라')).toBeVisible();

    await page.goto('/app?mode=second');
    await expect(page.getByText('오늘은 여기까지 해도 됩니다')).toBeVisible();

    for (const banned of ['공식 채점', '합격/불합격', '점수 보장', '결제']) {
      await expect(page.getByText(banned)).toHaveCount(0);
    }
  });
});
