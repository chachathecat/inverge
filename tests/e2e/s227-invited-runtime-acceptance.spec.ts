import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

import {
  captureSanitizedScreenshot,
  loginWithDedicatedTestAccount,
  monitorRuntimeErrors,
  protectionHeaders,
  requireSafeAuthenticatedRuntime,
  runtimeBaseUrl,
  runtimeRunnerSha,
  runtimeTargetSha,
} from "./support/authenticated-runtime";

const runtimeEnabled = process.env.S227_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;

const calculatorStepIds = [
  "conditions",
  "formula",
  "numbers_units",
  "casio_input",
  "display_value",
  "answer_value",
  "unit_rounding",
  "verification",
  "mistake_type",
] as const;

const calculatorEntries: Record<(typeof calculatorStepIds)[number], string> = {
  conditions: "합성 조건을 원문과 대조했습니다.",
  formula: "합성 산식 A = B × C를 선택했습니다.",
  numbers_units: "합성 값 100원 × 2회를 확인했습니다.",
  casio_input: "100 × 2 EXE 합성 입력을 직접 확인했습니다.",
  display_value: "합성 화면값 200을 확인했습니다.",
  answer_value: "합성 답안 기재값 200원을 확인했습니다.",
  unit_rounding: "원 단위 반올림 기준을 확인했습니다.",
  verification: "",
  mistake_type: "",
};

const calculatorDraftStoragePrefix = "inverge.calculatorRoutine.draft.v1:";

test.use({
  extraHTTPHeaders: protectionHeaders,
  screenshot: "off",
  trace: "off",
  video: "off",
});

test.skip(
  !runtimeEnabled,
  "Set S227_AUTH_RUNTIME=1 for the owner-approved invited-account runtime acceptance.",
);

function safeSuffix() {
  return randomUUID().replaceAll("-", "").slice(0, 10);
}

async function createSyntheticSourceItem(page: Page, suffix: string) {
  const problemTitle = "S227 합성 학습 기록 " + suffix;
  const originalParagraph =
    "사업인정은 공익사업의 시행을 확정하고 수용권을 설정하는 처분으로 검토합니다. " +
    "이 문장은 초대 계정 흐름 검증만을 위한 합성 기록입니다.";
  const biggestGap = "처분성의 근거와 구체적 법률효과를 연결하는 문장이 빠져 있습니다.";
  const referenceSummary =
    "사업인정의 공익사업 확정, 수용권 설정, 권리구제 필요성을 순서대로 확인합니다.";

  const response = await page.context().request.post("/api/os/items", {
    data: {
      examName: "감정평가사 2차",
      subjectLabel: "감정평가 및 보상법규",
      sourceType: "text",
      sourceLabel: "S227 synthetic invited-account runtime",
      problemTitle,
      rawQuestionText: "사업인정의 처분성을 검토하시오. 합성 테스트 데이터입니다.",
      rawAnswerText: originalParagraph,
      correctAnswer: referenceSummary,
      userAnswer: originalParagraph,
      userReasonText: biggestGap,
      confidence: "중간",
      keyConcepts: ["사업인정", "처분성", "수용권"],
      missingIssue: biggestGap,
      weakStructurePoint: "법률효과와 권리구제 필요성을 같은 순서로 연결해야 합니다.",
      weakApplicationSentence: "사업인정으로 발생하는 구체적 법률효과를 적어야 합니다.",
      rewriteInstruction: "처분의 법률효과와 권리구제 필요성을 한 문단에 연결합니다.",
      referenceStructure: referenceSummary,
      myAnswerSummary: originalParagraph,
      issueRecall: "사업인정의 처분성을 법률효과 중심으로 검토합니다.",
      outlineDraft: "I. 사업인정의 성격 II. 수용권 설정 III. 권리구제 IV. 결론",
      productionBeforeComparison: true,
      referenceAnswerAddedAfterProduction: true,
      biggestGap,
      rewriteCompleted: false,
      captureIntent: "save",
      createdFromCapture: true,
      extractionPayload: {
        raw_ocr_text: originalParagraph,
        raw_extraction_json: {},
        normalized_draft: null,
        user_confirmed_fields: {
          subjectLabel: "감정평가 및 보상법규",
          userAnswer: originalParagraph,
          production_before_comparison: true,
          reference_answer_added_after_production: true,
          biggest_gap: biggestGap,
          sourceType: "text",
          examMode: "second",
        },
      },
    },
  });

  expect(response.ok(), "Synthetic source fixture must be durably created.").toBe(true);
  const body = (await response.json()) as {
    ok?: boolean;
    item?: { id?: string };
    error?: string;
  };
  expect(body.ok, body.error ?? "Synthetic source fixture response must be ok.").toBe(true);
  expect(body.item?.id).toBeTruthy();

  return {
    sourceItemId: body.item!.id!,
    problemTitle,
    biggestGap,
  };
}

async function createSyntheticEvidenceEmptyItem(page: Page, suffix: string) {
  const problemTitle = "S227 합성 빈 근거 기록 " + suffix;
  const biggestGap = "비교 근거를 추가하기 전의 정직한 빈 상태를 확인합니다.";
  const response = await page.context().request.post("/api/os/items", {
    data: {
      examName: "감정평가사 2차",
      subjectLabel: "감정평가이론",
      sourceType: "text",
      sourceLabel: "S227 synthetic empty-evidence runtime",
      problemTitle,
      correctAnswer: "",
      userAnswer: "",
      userReasonText: biggestGap,
      confidence: "중간",
      keyConcepts: ["시장가치", "가치다원성"],
      missingIssue: biggestGap,
      weakStructurePoint: "근거를 확인한 뒤 구조를 보강합니다.",
      weakApplicationSentence: "확인되지 않은 근거는 단정하지 않습니다.",
      rewriteInstruction: "근거를 확인한 뒤 한 문단을 작성합니다.",
      referenceStructure: "",
      myAnswerSummary: "",
      issueRecall: "시장가치와 가치다원성의 관계를 확인합니다.",
      outlineDraft: "I. 시장가치 II. 가치다원성 III. 관계",
      productionBeforeComparison: true,
      referenceAnswerAddedAfterProduction: false,
      biggestGap,
      rewriteCompleted: false,
      captureIntent: "save",
    },
  });

  expect(response.ok(), "Synthetic empty-evidence fixture must be durably created.").toBe(true);
  const body = (await response.json()) as {
    ok?: boolean;
    item?: { id?: string };
    error?: string;
  };
  expect(body.ok, body.error ?? "Synthetic empty-evidence fixture response must be ok.").toBe(true);
  expect(body.item?.id).toBeTruthy();

  return {
    itemId: body.item!.id!,
    problemTitle,
  };
}

async function expectNoUnsafeClaims(page: Page) {
  await expect(page.locator('a[href*="/instructor"], a[href*="/studio"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(
    /official grading|official score|pass\/fail|pass guarantee|model answer|AI final judgment|합격\s*(가능성|확률|보장)|공식\s*채점\s*(결과|완료|확정|제공|입니다)|공식\s*점수\s*(결과|확정|제공|입니다)|공식\s*모범답안\s*(입니다|제공|확정)|AI\s*최종\s*판정/i,
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(2);
}

async function expectTodayMission(page: Page) {
  await expect(page.locator("[data-s226-primary-mission]")).toBeVisible();
  await expect(page.locator("[data-s226-primary-cta]")).toHaveCount(1);
  const plan = page.locator("[data-today-plan-primary-surface]");
  await expect(plan).toBeVisible();
  expect(Number(await plan.getAttribute("data-visible-primary-task-cap"))).toBeLessThanOrEqual(3);
  expect(await plan.locator("[data-today-plan-primary-task]").count()).toBeLessThanOrEqual(3);
  await expectNoHorizontalOverflow(page);
  await expectNoUnsafeClaims(page);
}

async function tabTo(page: Page, target: Locator, maximumStops = 80) {
  await expect(target).toBeVisible();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });

  let stops = 0;
  let reached = false;
  while (stops < maximumStops && !reached) {
    await page.keyboard.press("Tab");
    stops += 1;
    reached = await target.evaluate((element) => element === document.activeElement);
  }

  expect(reached, "The dominant action must be reachable with Tab.").toBe(true);
  await expect(target, "Tab must leave the dominant action focused.").toBeFocused();

  // Chromium can focus a below-the-fold control before completing its visual
  // scroll in a tall mobile document. Preserve the keyboard focus, bring that
  // same control into view, and then assert both viewport intersection and the
  // real :focus-visible treatment.
  await target.scrollIntoViewIfNeeded();
  await expect(target, "Scrolling must not move focus away from the action.").toBeFocused();
  const focus = await target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const intersectionWidth =
      Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
    const intersectionHeight =
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    return {
      intersectionRatio:
        rect.width > 0 && rect.height > 0
          ? (Math.max(0, intersectionWidth) * Math.max(0, intersectionHeight)) /
            (rect.width * rect.height)
          : 0,
      focusVisible: element.matches(":focus-visible"),
      hasIndicator:
        (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) ||
        (style.boxShadow !== "none" && style.boxShadow.length > 0),
    };
  });
  expect(
    focus.intersectionRatio,
    "The focused action must be substantially inside the viewport.",
  ).toBeGreaterThanOrEqual(0.8);
  expect(focus.focusVisible, "Keyboard focus must match :focus-visible.").toBe(true);
  expect(focus.hasIndicator, "The focused action must expose a visible indicator.").toBe(true);
  return stops;
}

async function screenshot(page: Page, testInfo: TestInfo, name: string, files: string[]) {
  files.push(await captureSanitizedScreenshot(page, testInfo, name));
}

async function clearCalculatorRoutineSessionDrafts(page: Page) {
  await page.evaluate((prefix) => {
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith(prefix)) window.sessionStorage.removeItem(key);
    }
  }, calculatorDraftStoragePrefix);
}

async function fillCalculatorStep(activeStep: Locator, stepId: (typeof calculatorStepIds)[number]) {
  if (stepId === "verification") {
    await activeStep.getByLabel("역산", { exact: true }).check();
    return;
  }
  if (stepId === "mistake_type") {
    await activeStep.getByLabel("실수 없음", { exact: true }).check();
    return;
  }
  await activeStep.locator("textarea").fill(calculatorEntries[stepId]);
}

async function exerciseCalculatorMatrix(
  page: Page,
  testInfo: TestInfo,
  screenshots: string[],
  keyboardStops: Record<string, number>,
) {
  await clearCalculatorRoutineSessionDrafts(page);
  await page.goto("/app/calculator?mode=second&context=practice&focus=casio", {
    waitUntil: "domcontentloaded",
  });

  const trainer = page.locator("[data-calculator-routine-trainer]");
  await expect(trainer).toHaveCount(1);
  await expect(trainer).toContainText("CASIO fx-9860GIII");
  await expect(trainer).toContainText("기기 검증 전");
  await expect(trainer).toHaveAttribute("data-calculator-routine-state", "collapsed");
  await trainer.getByRole("button", { name: /루틴 시작/ }).click();
  await expect(trainer).toHaveAttribute("data-calculator-routine-state", "active");
  await expect(trainer).toHaveAttribute("data-calculator-routine-view-state", "active");

  const firstStep = trainer.locator("[data-calculator-routine-active-step]");
  await expect(firstStep).toHaveCount(1);
  await expect(firstStep).toHaveAttribute("data-calculator-routine-active-step", calculatorStepIds[0]);
  await fillCalculatorStep(firstStep, calculatorStepIds[0]);
  const firstAction = trainer.getByRole("button", { name: /^다음 · / });

  await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  keyboardStops.calculatorActive = await tabTo(page, firstAction, 50);
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(trainer).toHaveAttribute("data-calculator-routine-state", "active");
    await expect(trainer.locator("[data-calculator-routine-active-step]")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    await expectNoUnsafeClaims(page);
    await screenshot(page, testInfo, `s227-calculator-active-${viewport.label}.png`, screenshots);
  }
  await firstAction.click();

  for (const [index, stepId] of calculatorStepIds.entries()) {
    if (index === 0) continue;
    const activeStep = trainer.locator("[data-calculator-routine-active-step]");
    await expect(activeStep).toHaveCount(1);
    await expect(activeStep).toHaveAttribute("data-calculator-routine-active-step", stepId);
    await fillCalculatorStep(activeStep, stepId);
    const primaryAction = trainer.getByRole("button", {
      name: index === calculatorStepIds.length - 1 ? "계산·검산 루틴 완료" : /^다음 · /,
    });
    await expect(primaryAction).toBeEnabled();
    await primaryAction.click();
  }

  await expect(trainer).toHaveAttribute("data-calculator-routine-state", "completed");
  await expect(trainer).toHaveAttribute("data-calculator-routine-view-state", "completed");
  await expect(trainer).toContainText("9/9 단계 기록됨");
  await expect(trainer).toContainText("기기 검증 전");
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expectNoHorizontalOverflow(page);
    await expectNoUnsafeClaims(page);
    await screenshot(page, testInfo, `s227-calculator-completed-${viewport.label}.png`, screenshots);
  }
}

async function exerciseDetailErrorOfflineMatrix(
  browser: Browser,
  page: Page,
  testInfo: TestInfo,
  suffix: string,
  screenshots: string[],
) {
  // Keep the deliberate invalid-ID response and browser-offline transition in
  // a separate authenticated context. This prevents the primary learner-loop
  // zero-error monitor from seeing expected offline request failures.
  const boundaryContext = await browser.newContext({
    baseURL: runtimeBaseUrl,
    extraHTTPHeaders: protectionHeaders,
  });
  await boundaryContext.addCookies(await page.context().cookies());
  const boundaryPage = await boundaryContext.newPage();
  try {
    for (const viewport of viewports) {
      await boundaryPage.setViewportSize({ width: viewport.width, height: viewport.height });
      await boundaryPage.goto(`/app/items/s227-invalid-${suffix}?mode=second`, {
        waitUntil: "domcontentloaded",
      });
      const boundary = boundaryPage.locator('[data-s228-state="error"]');
      await expect(boundary).toBeVisible();
      await expect(boundaryPage.getByRole("button", { name: "다시 시도" })).toBeVisible();
      await expectNoHorizontalOverflow(boundaryPage);
      await screenshot(boundaryPage, testInfo, `s227-detail-error-${viewport.label}.png`, screenshots);

      await boundaryContext.setOffline(true);
      await expect(boundaryPage.locator('[data-s228-state="offline"]')).toBeVisible();
      await expect(boundaryPage.getByText("현재 오프라인입니다.", { exact: true })).toBeVisible();
      await screenshot(boundaryPage, testInfo, `s227-detail-offline-${viewport.label}.png`, screenshots);
      await boundaryContext.setOffline(false);
      await expect(boundaryPage.locator('[data-s228-state="error"]')).toBeVisible();
    }
  } finally {
    await boundaryContext.setOffline(false);
    await boundaryContext.close();
  }
}

test.describe("S227 invited-account runtime visual-density acceptance", () => {
  test.describe.configure({ timeout: 600_000, retries: 0 });

  test("learner loop, detail states, and calculator stay durable at 390/768/1440", async ({ browser, page }, testInfo) => {
    requireSafeAuthenticatedRuntime("S227", {
      requireTargetSha: true,
      requireExactHead: true,
    });
    const runtimeErrors = monitorRuntimeErrors(page);
    const screenshots: string[] = [];
    const keyboardStops: Record<string, number> = {};

    await page.setViewportSize({ width: 390, height: 844 });
    const { signInAttempts } = await loginWithDedicatedTestAccount(page, "second");

    await page.goto("/app/capture?mode=second");
    await expect(page.locator('[data-s224v-surface="/app/capture"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoUnsafeClaims(page);
    await screenshot(page, testInfo, "s227-capture-initial-empty-390.png", screenshots);

    const suffix = safeSuffix();
    const fixture = await createSyntheticSourceItem(page, suffix);
    const emptyEvidenceFixture = await createSyntheticEvidenceEmptyItem(page, suffix);

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(
        "/app/items/" + encodeURIComponent(fixture.sourceItemId) + "?mode=second",
      );
      const normalDetail = page.locator("[data-s228-study-ledger-detail]");
      await expect(normalDetail).toBeVisible();
      await expect(page.locator("[data-s228-biggest-gap]")).toContainText(fixture.biggestGap);
      await expect(normalDetail.locator("[data-s228-evidence-excerpt]")).toHaveCount(2);
      await expect(normalDetail.locator('[data-s228-state="completed"]')).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await expectNoUnsafeClaims(page);
      await screenshot(page, testInfo, `s227-detail-normal-${viewport.label}.png`, screenshots);

      await page.goto(
        "/app/items/" + encodeURIComponent(emptyEvidenceFixture.itemId) + "?mode=second",
      );
      const emptyEvidenceDetail = page.locator("[data-s228-study-ledger-detail]");
      await expect(emptyEvidenceDetail).toBeVisible();
      await expect(emptyEvidenceDetail.locator('[data-s228-state="empty"]')).toBeVisible();
      await expect(emptyEvidenceDetail.locator("[data-s228-evidence-excerpt]")).toHaveCount(0);
      await expect(page.getByText("참고용 근거가 연결되지 않았습니다.", { exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoUnsafeClaims(page);
      await screenshot(
        page,
        testInfo,
        `s227-detail-empty-evidence-${viewport.label}.png`,
        screenshots,
      );
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      "/app/items/" + encodeURIComponent(fixture.sourceItemId) + "?mode=second",
    );
    keyboardStops.detailRewrite = await tabTo(
      page,
      page.locator("[data-s228-primary-action]"),
    );
    await Promise.all([
      page.waitForURL((url) => {
        return (
          url.pathname === "/app/capture" &&
          url.searchParams.get("mode") === "second" &&
          url.searchParams.get("rewriteFrom") === fixture.sourceItemId
        );
      }),
      page.keyboard.press("Enter"),
    ]);

    const rewrittenParagraph =
      "사업인정은 공익사업 시행을 확정하면서 수용권을 설정하여 국민의 권리관계에 직접 영향을 주고, " +
      "그 법률효과에 대한 권리구제가 필요하므로 처분성을 인정할 수 있습니다. 합성 테스트 문단입니다.";
    await expect(page.getByText("문단 다시쓰기 컨텍스트", { exact: true })).toBeVisible();
    await page.getByLabel("다시 쓴 문단", { exact: true }).fill(rewrittenParagraph);
    keyboardStops.captureSave = await tabTo(
      page,
      page.getByRole("button", { name: "문단 다시쓰기 저장", exact: true }),
    );
    await screenshot(page, testInfo, "s227-capture-input-390.png", screenshots);

    const [rewriteResponse] = await Promise.all([
      page.waitForResponse((candidate) => {
        const url = new URL(candidate.url());
        return candidate.request().method() === "POST" && url.pathname === "/api/os/items";
      }),
      page.keyboard.press("Enter"),
    ]);
    expect(rewriteResponse.ok(), "Rewrite save must reach durable account storage.").toBe(true);
    const rewriteBody = (await rewriteResponse.json()) as {
      ok?: boolean;
      item?: { id?: string };
      error?: string;
    };
    expect(rewriteBody.ok, rewriteBody.error ?? "Rewrite response must be ok.").toBe(true);
    expect(rewriteBody.item?.id).toBeTruthy();
    const rewriteItemId = rewriteBody.item!.id!;

    const confirmation = page.getByTestId("capture-save-confirmation");
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText("계정 기록에 저장");
    await screenshot(page, testInfo, "s227-capture-saved-390.png", screenshots);

    await page.goto("/app/items/" + encodeURIComponent(rewriteItemId) + "?mode=second");
    await expect(page.locator('[data-s228-state="completed"]')).toContainText(rewrittenParagraph);
    await page.reload();
    await expect(page.locator('[data-s228-state="completed"]')).toContainText(rewrittenParagraph);

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto("/app?mode=second");
      await expectTodayMission(page);
      keyboardStops["today" + viewport.label] = await tabTo(
        page,
        page.locator("[data-s226-primary-cta]"),
      );
      await screenshot(page, testInfo, `s227-today-${viewport.label}.png`, screenshots);

      await page.goto("/app/capture?mode=second");
      await expect(page.locator('[data-s224v-surface="/app/capture"]')).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoUnsafeClaims(page);
      await screenshot(
        page,
        testInfo,
        `s227-capture-empty-${viewport.label}.png`,
        screenshots,
      );

      await page.goto("/app/notes?mode=second");
      await expect(page.locator('[data-s224v-surface="/app/notes"]')).toBeVisible();
      await expect(page.locator("body")).toContainText(fixture.problemTitle);
      await expectNoHorizontalOverflow(page);
      await expectNoUnsafeClaims(page);
      await screenshot(page, testInfo, `s227-notes-${viewport.label}.png`, screenshots);

      await page.goto("/app/review?mode=second");
      await expect(page.locator('[data-s224v-surface="/app/review"]')).toBeVisible();
      await expect(page.locator("body")).toContainText(fixture.problemTitle);
      await expect(page.locator("[data-review-primary-surface]")).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoUnsafeClaims(page);
      if (viewport.width === 390) {
        keyboardStops.review = await tabTo(
          page,
          page.locator("[data-s224v-dominant-primary-action]"),
        );
      }
      await screenshot(page, testInfo, `s227-review-${viewport.label}.png`, screenshots);

      await page.goto("/app/items/" + encodeURIComponent(rewriteItemId) + "?mode=second");
      await expect(page.locator('[data-s228-state="completed"]')).toContainText(rewrittenParagraph);
      await expect(page.locator("[data-s228-evidence-excerpt]").first()).toContainText(
        rewrittenParagraph,
      );
      await expectNoHorizontalOverflow(page);
      await expectNoUnsafeClaims(page);
      await screenshot(page, testInfo, `s227-detail-completed-${viewport.label}.png`, screenshots);
    }

    await exerciseCalculatorMatrix(page, testInfo, screenshots, keyboardStops);
    await exerciseDetailErrorOfflineMatrix(browser, page, testInfo, suffix, screenshots);

    const cleanRuntime =
      runtimeErrors.consoleErrors.length === 0 &&
      runtimeErrors.pageErrors.length === 0 &&
      runtimeErrors.sameOriginRequestFailures.length === 0;
    const manifest = {
      result: cleanRuntime ? "pass" : "fail",
      suite: "s227-invited-account-runtime",
      runnerSha: runtimeRunnerSha,
      targetDeploymentSha: runtimeTargetSha,
      signInAttempts,
      viewports: viewports.map(({ width, height }) => `${width}x${height}`),
      routes: [
        "/app?mode=second",
        "/app/capture?mode=second",
        "/app/notes?mode=second",
        "/app/items/[synthetic-item]?mode=second",
        "/app/review?mode=second",
        "/app/calculator?mode=second&context=practice&focus=casio",
      ],
      stateMatrix: {
        calculator: {
          active: viewports.map(({ label }) => label),
          completed: viewports.map(({ label }) => label),
          canonicalStepCount: calculatorStepIds.length,
          deviceStatus: "기기 검증 전",
          realDeviceVerified: false,
        },
        detail: {
          normal: viewports.map(({ label }) => label),
          emptyEvidence: viewports.map(({ label }) => label),
          completed: viewports.map(({ label }) => label),
          error: viewports.map(({ label }) => label),
          offline: viewports.map(({ label }) => label),
        },
      },
      expectedBoundaryFailureCount: viewports.length,
      unexpectedBoundaryFailureCount: 0,
      keyboardStops,
      consoleErrorCount: runtimeErrors.consoleErrors.length,
      pageErrorCount: runtimeErrors.pageErrors.length,
      sameOriginRequestFailureCount: runtimeErrors.sameOriginRequestFailures.length,
      persistence: "durable",
      comparisonSurvivedReload: true,
      syntheticDataOnly: true,
      credentialsRedacted: true,
      traceCaptured: false,
      videoCaptured: false,
      screenshots,
    };
    await writeFile(
      testInfo.outputPath("s227-runtime.json"),
      JSON.stringify(manifest, null, 2),
      "utf8",
    );

    expect(runtimeErrors.consoleErrors, "Browser console errors must be zero.").toEqual([]);
    expect(runtimeErrors.pageErrors, "Uncaught page errors must be zero.").toEqual([]);
    expect(
      runtimeErrors.sameOriginRequestFailures,
      "Unexpected same-origin request failures must be zero.",
    ).toEqual([]);
  });
});
