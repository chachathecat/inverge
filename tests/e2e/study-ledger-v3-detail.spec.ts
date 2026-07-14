import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

const runtimeEnabled = process.env.S228_AUTH_RUNTIME === "1";
const runtimeBaseUrl = process.env.E2E_BASE_URL?.trim() ?? "";
const testEmail = process.env.E2E_USER_EMAIL?.trim() ?? "";
const testPassword = process.env.E2E_USER_PASSWORD ?? "";
const vercelBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ?? "";

const protectionHeaders: Record<string, string> = vercelBypassSecret
  ? {
      "x-vercel-protection-bypass": vercelBypassSecret,
      "x-vercel-set-bypass-cookie": "true",
    }
  : {};

test.use({
  extraHTTPHeaders: protectionHeaders,
  screenshot: "off",
  trace: "off",
  video: "off",
});

test.skip(!runtimeEnabled, "Set S228_AUTH_RUNTIME=1 for the owner-approved authenticated runtime acceptance.");

function requireSafeRuntimeEnvironment() {
  const missing = [
    ["E2E_BASE_URL", runtimeBaseUrl],
    ["E2E_USER_EMAIL", testEmail],
    ["E2E_USER_PASSWORD", testPassword],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error("S228 runtime acceptance missing required env: " + missing.join(", "));
  }

  const url = new URL(runtimeBaseUrl);
  const host = url.hostname.toLowerCase();
  const productionHosts = new Set([
    "inverge.vercel.app",
    "inverge.ai",
    "www.inverge.ai",
    "inverge.app",
    "www.inverge.app",
  ]);

  if (productionHosts.has(host)) {
    throw new Error("S228 runtime acceptance refuses production. Use an approved non-production Preview or staging URL.");
  }

  if (host.endsWith(".vercel.app") && !vercelBypassSecret) {
    throw new Error("S228 runtime acceptance requires VERCEL_AUTOMATION_BYPASS_SECRET for a protected Vercel Preview.");
  }
}

function sanitizeEvidence(value: string) {
  let sanitized = value;
  if (testEmail) sanitized = sanitized.replaceAll(testEmail, "[redacted-email]");
  if (testPassword) sanitized = sanitized.replaceAll(testPassword, "[redacted-password]");
  if (vercelBypassSecret) sanitized = sanitized.replaceAll(vercelBypassSecret, "[redacted-bypass]");
  return sanitized;
}

async function login(page: Page) {
  await page.goto("/login?mode=second", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("이메일")).toBeVisible();
  await page.getByLabel("이메일").fill(testEmail);
  await page.getByLabel("비밀번호").fill(testPassword);

  const [response] = await Promise.all([
    page.waitForResponse((candidate) => {
      const url = new URL(candidate.url());
      return candidate.request().method() === "POST" && url.pathname === "/api/auth/sign-in";
    }),
    page.getByTestId("login-submit").click(),
  ]);

  expect(response.ok(), "The app login endpoint must accept the dedicated test account.").toBe(true);
  await expect(page).toHaveURL((url) => url.pathname === "/app");
}

async function createSyntheticSourceItem(page: Page, suffix: string) {
  const originalParagraph =
    "합리적 기대 가능성은 행정청의 공적 견해표명과 보호가치 있는 신뢰를 중심으로 검토합니다. " +
    "다만 이 문단은 비교를 위한 합성 테스트 기록입니다.";
  const sourceGap = "신뢰보호 요건과 사실관계의 대응 문장이 빠져 있습니다.";
  const referenceSummary = "공적 견해표명, 귀책사유 부재, 신뢰에 따른 행위, 보호가치를 순서대로 확인합니다.";
  const response = await page.context().request.post("/api/os/items", {
    data: {
      examName: "감정평가사 2차",
      subjectLabel: "감정평가 및 보상법규",
      sourceType: "text",
      sourceLabel: "S228 synthetic runtime acceptance",
      problemTitle: "S228 synthetic Study Ledger " + suffix,
      rawQuestionText: "신뢰보호원칙의 적용 요건을 검토하시오. 합성 테스트 데이터입니다.",
      rawAnswerText: originalParagraph,
      correctAnswer: referenceSummary,
      userAnswer: originalParagraph,
      userReasonText: sourceGap,
      confidence: "중간",
      keyConcepts: ["신뢰보호", "공적 견해표명", "보호가치"],
      missingIssue: sourceGap,
      weakStructurePoint: "요건과 사실 적용을 같은 순서로 연결해야 합니다.",
      weakApplicationSentence: "공적 견해표명에 해당하는 사실을 구체적으로 연결해야 합니다.",
      rewriteInstruction: "요건을 먼저 쓰고 대응 사실과 소결론을 한 문단에 연결합니다.",
      referenceStructure: referenceSummary,
      myAnswerSummary: originalParagraph,
      issueRecall: "신뢰보호 요건을 순서대로 검토합니다.",
      outlineDraft: "I. 공적 견해표명 II. 신뢰와 귀책 III. 보호가치 IV. 결론",
      productionBeforeComparison: true,
      referenceAnswerAddedAfterProduction: true,
      biggestGap: sourceGap,
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
          biggest_gap: sourceGap,
          sourceType: "text",
          examMode: "second",
        },
      },
    },
  });

  expect(response.ok(), "Synthetic source fixture must be durably created in the dedicated test account.").toBe(true);
  const body = (await response.json()) as { ok?: boolean; item?: { id?: string }; error?: string };
  expect(body.ok, body.error ?? "Synthetic source fixture response must be ok.").toBe(true);
  expect(body.item?.id).toBeTruthy();
  return {
    sourceItemId: body.item!.id!,
    originalParagraph,
    sourceGap,
  };
}

async function expectLedgerLayout(page: Page) {
  await expect(page.locator("[data-s228-study-ledger-detail]")).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("[data-s228-primary-action]")).toHaveCount(1);
  await expect(page.locator("[data-s228-primary-action]")).toBeVisible();
  await expect(page.locator("[data-s228-trust-evidence]")).toBeVisible();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(2);
}

async function tabToPrimaryAction(page: Page) {
  const primaryAction = page.locator("[data-s228-primary-action]");
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });

  let tabStops = 0;
  let reachedPrimaryAction = false;
  while (tabStops < 40 && !reachedPrimaryAction) {
    await page.keyboard.press("Tab");
    tabStops += 1;
    reachedPrimaryAction = await primaryAction.evaluate((element) => element === document.activeElement);
  }

  expect(reachedPrimaryAction, "The primary rewrite action must be reachable with Tab.").toBe(true);
  const focusState = await primaryAction.evaluate((element) => {
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
  expect(focusState.visible, "Focused CTA must remain visible in the viewport.").toBe(true);
  expect(focusState.hasIndicator, "Focused CTA must expose an outline or focus ring.").toBe(true);
  return tabStops;
}

async function captureEvidence(page: Page, testInfo: TestInfo, fileName: string) {
  const path = testInfo.outputPath(fileName);
  await page.screenshot({
    path,
    fullPage: true,
    mask: [page.getByText(testEmail, { exact: false })],
  });
  return fileName;
}

test.describe("S228 authenticated Study Ledger runtime acceptance", () => {
  test.describe.configure({ timeout: 240_000 });

  test("390/1440, keyboard, zero console errors, and durable rewrite comparison", async ({ page }, testInfo) => {
    requireSafeRuntimeEnvironment();

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const sameOriginRequestFailures: string[] = [];
    const runtimeOrigin = new URL(runtimeBaseUrl).origin;
    const screenshots: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(sanitizeEvidence(message.text()));
    });
    page.on("pageerror", (error) => {
      pageErrors.push(sanitizeEvidence(error.message));
    });
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      const failure = request.failure()?.errorText ?? "unknown";
      if (url.origin !== runtimeOrigin || failure.includes("ERR_ABORTED")) return;
      sameOriginRequestFailures.push(
        sanitizeEvidence(request.method() + " " + url.pathname + " " + failure),
      );
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
    const fixture = await createSyntheticSourceItem(page, suffix);

    await page.goto("/app/items/" + encodeURIComponent(fixture.sourceItemId) + "?mode=second");
    await expectLedgerLayout(page);
    await expect(page.locator("[data-s228-biggest-gap]")).toContainText(fixture.sourceGap);
    screenshots.push(await captureEvidence(page, testInfo, "s228-before-390.png"));

    const tabStopsToPrimaryAction = await tabToPrimaryAction(page);
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

    await expect(page.getByText("문단 다시쓰기 컨텍스트", { exact: true })).toBeVisible();
    const rewrittenParagraph =
      "행정청의 공적 견해표명이 있었고 학습자에게 귀책사유가 없으며, 그 신뢰에 따른 행위와 보호가치를 " +
      "사실관계에 대응해 검토하므로 신뢰보호원칙의 적용 가능성을 인정할 수 있습니다. 합성 테스트 문단입니다.";
    await page.getByLabel("다시 쓴 문단", { exact: true }).fill(rewrittenParagraph);

    const [rewriteResponse] = await Promise.all([
      page.waitForResponse((candidate) => {
        const url = new URL(candidate.url());
        return candidate.request().method() === "POST" && url.pathname === "/api/os/items";
      }),
      page.getByRole("button", { name: "문단 다시쓰기 저장", exact: true }).click(),
    ]);
    expect(rewriteResponse.ok(), "Rewrite save must reach durable account storage.").toBe(true);
    const rewriteBody = (await rewriteResponse.json()) as {
      ok?: boolean;
      item?: { id?: string };
      error?: string;
    };
    expect(rewriteBody.ok, rewriteBody.error ?? "Rewrite response must be ok.").toBe(true);
    expect(rewriteBody.item?.id).toBeTruthy();

    const confirmation = page.getByTestId("capture-save-confirmation");
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText("계정 기록에 저장");

    const rewriteItemId = rewriteBody.item!.id!;
    await page.goto("/app/items/" + encodeURIComponent(rewriteItemId) + "?mode=second");
    await expectLedgerLayout(page);
    const comparison = page.locator('[data-s228-state="completed"]');
    await expect(comparison).toBeVisible();
    await expect(comparison).toContainText("전·후 비교가 준비되었습니다.");
    await expect(comparison).toContainText(rewrittenParagraph);
    await expect(page.locator('[data-s228-state-chip="completed"]')).toBeVisible();
    await expect(page.locator("[data-s228-evidence-excerpt]").first()).toContainText(rewrittenParagraph);

    await page.reload();
    await expectLedgerLayout(page);
    await expect(page.locator('[data-s228-state="completed"]')).toContainText(rewrittenParagraph);
    await expect(page.locator("[data-s228-evidence-excerpt]").first()).toContainText(rewrittenParagraph);
    screenshots.push(await captureEvidence(page, testInfo, "s228-after-reload-390.png"));

    await page.setViewportSize({ width: 1440, height: 1024 });
    await page.reload();
    await expectLedgerLayout(page);
    await expect(page.locator('[data-s228-state="completed"]')).toContainText(rewrittenParagraph);
    screenshots.push(await captureEvidence(page, testInfo, "s228-after-reload-1440.png"));

    const cleanRuntime =
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      sameOriginRequestFailures.length === 0;
    const manifest = {
      result: cleanRuntime ? "pass" : "fail",
      viewports: ["390x844", "1440x1024"],
      tabStopsToPrimaryAction,
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      sameOriginRequestFailureCount: sameOriginRequestFailures.length,
      persistence: "durable",
      comparisonSurvivedReload: true,
      screenshots,
    };
    await writeFile(
      testInfo.outputPath("s228-runtime.json"),
      JSON.stringify(manifest, null, 2),
      "utf8",
    );

    expect(consoleErrors, "Browser console errors must be zero.").toEqual([]);
    expect(pageErrors, "Uncaught page errors must be zero.").toEqual([]);
    expect(sameOriginRequestFailures, "Unexpected same-origin request failures must be zero.").toEqual([]);
  });
});
