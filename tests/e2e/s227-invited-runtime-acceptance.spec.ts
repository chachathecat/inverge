import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

import {
  captureSanitizedScreenshot,
  loginWithDedicatedTestAccount,
  monitorRuntimeErrors,
  protectionHeaders,
  requireSafeAuthenticatedRuntime,
  runtimeTargetSha,
} from "./support/authenticated-runtime";

const runtimeEnabled = process.env.S227_AUTH_RUNTIME === "1";

const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1440", width: 1440, height: 1024 },
] as const;

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

async function expectNoUnsafeClaims(page: Page) {
  await expect(page.locator('a[href*="/instructor"], a[href*="/studio"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(
    /official grading|official score|pass\/fail|pass guarantee|model answer|AI final judgment|합격\s*(가능성|확률|보장)|공식\s*(채점|점수|모범답안)|AI\s*최종\s*판정/i,
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
  const focus = await target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      visible:
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth,
      hasIndicator:
        (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) ||
        (style.boxShadow !== "none" && style.boxShadow.length > 0),
    };
  });
  expect(focus.visible, "The focused action must stay visible.").toBe(true);
  expect(focus.hasIndicator, "The focused action must expose a visible indicator.").toBe(true);
  return stops;
}

async function screenshot(page: Page, testInfo: TestInfo, name: string, files: string[]) {
  files.push(await captureSanitizedScreenshot(page, testInfo, name));
}

test.describe("S227 invited-account runtime visual-density acceptance", () => {
  test.describe.configure({ timeout: 420_000 });

  test("Today, Capture, Notes, detail, and Review stay durable at 390/768/1440", async ({ page }, testInfo) => {
    requireSafeAuthenticatedRuntime("S227", { requireTargetSha: true });
    const runtimeErrors = monitorRuntimeErrors(page);
    const screenshots: string[] = [];
    const keyboardStops: Record<string, number> = {};

    await page.setViewportSize({ width: 390, height: 844 });
    await loginWithDedicatedTestAccount(page, "second");

    await page.goto("/app/capture?mode=second");
    await expect(page.getByTestId("capture-page-shell")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoUnsafeClaims(page);
    await screenshot(page, testInfo, "s227-capture-initial-empty-390.png", screenshots);

    const suffix = safeSuffix();
    const fixture = await createSyntheticSourceItem(page, suffix);

    await page.goto(
      "/app/items/" + encodeURIComponent(fixture.sourceItemId) + "?mode=second",
    );
    await expect(page.locator("[data-s228-study-ledger-detail]")).toBeVisible();
    await expect(page.locator("[data-s228-biggest-gap]")).toContainText(fixture.biggestGap);

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
      await expect(page.getByTestId("capture-page-shell")).toBeVisible();
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

    const cleanRuntime =
      runtimeErrors.consoleErrors.length === 0 &&
      runtimeErrors.pageErrors.length === 0 &&
      runtimeErrors.sameOriginRequestFailures.length === 0;
    const manifest = {
      result: cleanRuntime ? "pass" : "fail",
      suite: "s227-invited-account-runtime",
      runnerSha: process.env.GITHUB_SHA ?? "local",
      targetDeploymentSha: runtimeTargetSha,
      viewports: viewports.map(({ width, height }) => `${width}x${height}`),
      routes: [
        "/app?mode=second",
        "/app/capture?mode=second",
        "/app/notes?mode=second",
        "/app/items/[synthetic-item]?mode=second",
        "/app/review?mode=second",
      ],
      keyboardStops,
      consoleErrorCount: runtimeErrors.consoleErrors.length,
      pageErrorCount: runtimeErrors.pageErrors.length,
      sameOriginRequestFailureCount: runtimeErrors.sameOriginRequestFailures.length,
      persistence: "durable",
      comparisonSurvivedReload: true,
      syntheticDataOnly: true,
      credentialsRedacted: true,
      traceCaptured: false,
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
