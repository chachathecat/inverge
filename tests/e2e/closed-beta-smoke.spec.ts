import { expect, test, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';

const authStatePath = process.env.TEST_AUTH_STATE_PATH;
const authEmail = process.env.TEST_USER_EMAIL || process.env.E2E_USER_EMAIL;
const authPassword = process.env.TEST_USER_PASSWORD || process.env.E2E_USER_PASSWORD;
const hasAuthState = Boolean(authStatePath && fs.existsSync(authStatePath));
const hasAuthCredentials = Boolean(authEmail && authPassword);

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

function skipIfMissingAuth(testInfo: TestInfo) {
  if (!hasAuthState && !hasAuthCredentials) {
    testInfo.skip('Skipping auth-required smoke: TEST_AUTH_STATE_PATH or TEST_USER_EMAIL/TEST_USER_PASSWORD is required.');
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

    await expect(page.getByText('자료 넣기')).toBeVisible();
    await expect(page.getByText('구조화 확인')).toBeVisible();
    await expect(page.getByText('피드백 복사')).toBeVisible();

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
    await page.getByPlaceholder('OCR 초안(있는 경우)을 붙여 넣거나 직접 입력해 주세요.').fill('내 답안 입력 smoke');
    await page.getByPlaceholder('기준답안 또는 기준목차를 텍스트로 붙여 넣어 주세요.').fill('기준답안 입력 smoke');

    await page.getByRole('button', { name: 'OCR 구조화 시작' }).click();
    await expect(page.getByRole('button', { name: '다음 행동 하나 정리' })).toBeVisible();
    await expect(page.getByText('가장 큰 간극')).toBeVisible();

    await page.getByRole('button', { name: '다음 행동 하나 정리' }).click();
    await expect(page.getByRole('button', { name: '피드백 초안 복사' })).toBeVisible();
  });
});

test.describe('closed beta auth-required route smoke', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    skipIfMissingAuth(testInfo);
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
