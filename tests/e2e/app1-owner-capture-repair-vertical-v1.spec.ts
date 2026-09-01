import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const APP1_AUTH_RUNTIME = process.env.APP1_AUTH_RUNTIME ?? "0";
const baseURL = process.env.E2E_BASE_URL ?? "";
const ownerEmail = process.env.APP1_OWNER_EMAIL ?? "";
const ownerPassword = process.env.APP1_OWNER_PASSWORD ?? "";

const SOURCE_ITEM_ID = "11111111-1111-4111-8111-111111111111";
const REPAIR_ITEM_ID = "22222222-2222-4222-8222-222222222222";
const QUEUE_ID = "33333333-3333-4333-8333-333333333333";

const originalGap = "사례 사실과 논거의 연결이 약합니다.";
const syntheticRepair =
  "합성 사례의 사실 A는 위 논거의 요건 B를 충족하므로 결론 C에 이른다고 내가 직접 연결했다.\n\n둘째 문단에서 그 적용 이유를 직접 설명했다.";

const syntheticDetail = {
  item: {
    id: SOURCE_ITEM_ID,
    userId: "44444444-4444-4444-8444-444444444444",
    dedupeKey: "synthetic-app1-e2e-source",
    processingStatus: "completed",
    examName: "감정평가사 2차",
    subjectLabel: "감정평가이론",
    sourceType: "photo",
    sourceLabel: "synthetic-page-1",
    problemTitle: "저작권 안전 합성 문제",
    problemIdentifier: "SYNTHETIC-APP1-E2E",
    rawQuestionText: "합성 사례의 정의와 논거, 적용 관계를 설명하시오.",
    rawAnswerText: "정의를 제시하고 논거를 설명했으나 사례 사실과 논거를 충분히 연결하지 못했다.",
    rewriteParagraph: "",
    correctAnswer: "-",
    userAnswer: "정의를 제시하고 논거를 설명했으나 사례 사실과 논거를 충분히 연결하지 못했다.",
    userReasonText: originalGap,
    confidence: "중간",
    timeSpentSeconds: 720,
    nextReviewDate: "2026-08-30",
    keyConcepts: ["정의", "논거", "사례 적용"],
    coreFormula: "정의 → 논거 → 적용",
    comparisonPoint: "사례 적용을 직접 연결한다.",
    missingIssue: originalGap,
    weakStructurePoint: "적용 문장이 부족합니다.",
    weakApplicationSentence: "사례 사실을 논거에 연결합니다.",
    rewriteInstruction: "사례 사실과 논거를 한 문장으로 직접 연결하세요.",
    referenceStructure: "정의 → 논거 → 사례 적용 → 결론",
    myAnswerSummary: "정의와 논거를 적었으나 적용이 부족함",
    caseSummary: "저작권 안전 합성 사례",
    issueRecall: "정의, 논거, 적용",
    outlineDraft: "I. 정의 II. 논거 III. 적용",
    productionBeforeComparison: true,
    referenceAnswerAddedAfterProduction: false,
    biggestGap: originalGap,
    rewriteCompleted: false,
    captureIntent: "save",
    createdFromCapture: true,
    rawPayload: {
      user_confirmed_fields: {
        ocrConfirmedByLearner: true,
        pageCount: 1,
        lowConfidenceFlag: false,
        exact_anchor: "확인된 1페이지 · 적용 문단",
      },
    },
    derivedPayload: {},
    createdAt: "2026-08-29T00:00:00.000Z",
    updatedAt: "2026-08-29T00:01:00.000Z",
  },
  note: null,
  tags: [],
  recurrence: null,
  reviewQueue: [],
};

function repairQueueCard() {
  return {
    queueId: QUEUE_ID,
    itemId: REPAIR_ITEM_ID,
    examName: "감정평가사 2차",
    subjectLabel: "감정평가이론",
    problemTitle: "합성 문제 · 직접 복구",
    topicTag: "합성 태그",
    mistakeType: "연결 부족",
    reviewReason: "독립 복습",
    priorityScore: 1,
    dueAt: "2026-08-30T02:00:00.000Z",
    recurrenceCount: 0,
    confidence: "중간",
    timeSpentSeconds: 600,
    createdFromCapture: true,
    itemCreatedAt: "2026-08-29T02:00:00.000Z",
  };
}

type RepairPersistenceBinding = Readonly<{
  operationId: string;
  workRevisionId: string;
}>;

function syntheticRepairDetail(binding: RepairPersistenceBinding) {
  return {
    ...syntheticDetail,
    item: {
      ...syntheticDetail.item,
      id: REPAIR_ITEM_ID,
      dedupeKey: "synthetic-app1-e2e-repair",
      rawAnswerText: syntheticRepair,
      rewriteParagraph: syntheticRepair,
      userAnswer: syntheticRepair,
      nextReviewDate: "2026-08-30",
      updatedAt: "2026-08-29T02:00:00.000Z",
      rawPayload: {
        user_confirmed_fields: {
          persistence_operation_id: binding.operationId,
          persistence_work_revision_id: binding.workRevisionId,
        },
      },
    },
    reviewQueue: [repairQueueCard()],
  };
}

function structureDraft({
  gap = originalGap,
  strengths = ["정의와 핵심 논거가 확인됩니다."],
  weakParagraphPoint = "사례 사실을 논거에 연결하는 한 문장을 직접 적으세요.",
  weakLogicPoint = "논거에서 사례로 이어지는 연결을 확인합니다.",
} = {}) {
  return {
    questionSummary: "합성 문제의 구조를 검토합니다.",
    coreConcepts: ["정의", "논거", "적용"],
    requiredIssues: "정의, 논거, 사례 적용",
    userAnswerSummary: "정의와 논거가 있고 적용 연결을 확인합니다.",
    userAnswerStructure: "정의 → 논거 → 적용",
    referenceStructure: "정의 → 논거 → 적용 → 결론",
    strengths,
    missingIssueCandidates: [gap],
    weakParagraphPoint,
    weakLogicPoint,
    rewriteTarget: "적용 연결 문장",
    rewriteDraftSuggestion: "학습자가 직접 작성해야 합니다.",
    nextAction: "사례 사실과 논거를 한 문장으로 직접 연결하세요.",
    caution: "학습 보조 초안입니다.",
    plainExplanation: "한 연결만 직접 보강합니다.",
    keyTermExplanations: ["적용: 사실을 기준에 연결하는 단계"],
    stepByStepExplanation: ["논거 확인", "사례 사실 확인", "직접 연결"],
    examAnswerHints: ["적용 연결을 확인합니다."],
  };
}

function captureExtraction() {
  return {
    ok: true,
    mode: "second",
    raw_ocr_text: "합성 사례의 정의와 논거, 적용 관계를 설명하시오.",
    raw_extraction_json: { fixture: "app1-synthetic-only" },
    normalized_draft: {
      subject_guess: "감정평가이론",
      case_title: "저작권 안전 합성 문제",
      case_summary: "합성 사례의 정의와 논거, 적용 관계",
      reference_outline: "정의 → 논거 → 적용 → 결론",
      user_answer_summary: "정의와 논거를 적었으나 적용 연결이 부족함",
      missing_issue: originalGap,
      weak_sentence: "사례 사실을 논거에 연결하는 문장이 필요합니다.",
      weak_structure_point: "적용 연결 문장이 부족합니다.",
      rewrite_instruction: "사례 사실과 논거를 한 문장으로 직접 연결하세요.",
      review_date_suggestion: "2026-08-30",
      needs_review: false,
    },
  };
}

function requireLocalRuntime() {
  if (!baseURL || !ownerEmail || !ownerPassword) {
    throw new Error("APP-1 authenticated browser runtime environment is incomplete");
  }
  if (!["127.0.0.1", "localhost", "::1"].includes(new URL(baseURL).hostname)) {
    throw new Error("APP-1 browser runtime refused a non-local target");
  }
}

async function ownerContext(browser: Browser, viewport: { width: number; height: number }) {
  const context = await browser.newContext({ baseURL, viewport });
  const login = await context.request.post("/api/auth/sign-in", {
    data: { email: ownerEmail, password: ownerPassword, mode: "second" },
  });
  expect(login.status()).toBe(200);
  return context;
}

async function assertNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport + 1);
}

async function assertA11y(page: Page) {
  const scan = await new AxeBuilder({ page }).analyze();
  const blocking = scan.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  expect(blocking).toEqual([]);
}

type JsonRecord = Record<string, unknown>;
type ItemSaveClass = "initial_capture_save" | "app1_repair_save" | "unknown_item_save";
type InitialCaptureResponseClass = "synthetic_source_save_success";
type RepairResponseClass =
  | "synthetic_repair_save_503"
  | "synthetic_dedupe_conflict"
  | "synthetic_durable_success";

const APP1_VERIFICATION_STATES = [
  "repair_confirmed_for_this_session",
  "one_connection_still_missing",
  "guided_path_needed",
  "deferred",
  "blocked_by_ocr_or_source_uncertainty",
] as const;

const APP1_REPAIR_MARKER_KEYS = [
  "app1_contract_version",
  "app1_source_item_id",
  "app1_verification_state",
  "app1_same_session_only",
  "app1_mastery_created",
  "app1_transfer_created",
] as const;

function isPlainJsonRecord(value: unknown): value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasNonemptyString(record: JsonRecord, key: string) {
  return typeof record[key] === "string" && record[key].trim().length > 0;
}

function confirmedFieldsOf(submitted: JsonRecord) {
  const extractionPayload = submitted.extractionPayload;
  if (!isPlainJsonRecord(extractionPayload)) return null;
  const confirmed = extractionPayload.user_confirmed_fields;
  return isPlainJsonRecord(confirmed) ? confirmed : null;
}

function classifyItemSavePayload(value: unknown): ItemSaveClass {
  if (!isPlainJsonRecord(value)) return "unknown_item_save";
  const confirmed = confirmedFieldsOf(value);
  if (!confirmed) return "unknown_item_save";

  const hasPersistenceBinding =
    hasNonemptyString(confirmed, "persistence_operation_id") &&
    hasNonemptyString(confirmed, "persistence_work_revision_id");
  const supportedVerificationState = APP1_VERIFICATION_STATES.some(
    (state) => state === confirmed.app1_verification_state,
  );
  const isRepairSave =
    value.rewriteSourceItemId === SOURCE_ITEM_ID &&
    value.createdFromCapture === true &&
    value.captureIntent === "save" &&
    confirmed.app1_contract_version === "OwnerCaptureToRepairVerticalV1" &&
    confirmed.app1_source_item_id === SOURCE_ITEM_ID &&
    supportedVerificationState &&
    confirmed.app1_same_session_only === true &&
    confirmed.app1_mastery_created === false &&
    confirmed.app1_transfer_created === false &&
    value.rawAnswerText === syntheticRepair &&
    value.rewriteParagraph === syntheticRepair &&
    value.userAnswer === syntheticRepair &&
    !Object.prototype.hasOwnProperty.call(value, "nextReviewDate") &&
    hasPersistenceBinding;
  if (isRepairSave) return "app1_repair_save";

  const hasRepairMarker = APP1_REPAIR_MARKER_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(confirmed, key),
  );
  const sourceType = value.sourceType;
  const isSupportedCaptureSource =
    sourceType === "text" || sourceType === "photo" || sourceType === "pdf";
  const extractionPayload = value.extractionPayload as JsonRecord;
  const isInitialCaptureSave =
    value.createdFromCapture === true &&
    value.captureIntent === "save" &&
    value.examName === "감정평가사 2차" &&
    value.subjectLabel === "감정평가이론" &&
    isSupportedCaptureSource &&
    confirmed.sourceType === sourceType &&
    confirmed.subject === "감정평가이론" &&
    confirmed.examMode === "second" &&
    hasNonemptyString(extractionPayload, "raw_ocr_text") &&
    hasPersistenceBinding &&
    !hasRepairMarker &&
    value.rewriteSourceItemId !== SOURCE_ITEM_ID;
  return isInitialCaptureSave ? "initial_capture_save" : "unknown_item_save";
}

async function installSyntheticSeams(
  context: BrowserContext,
  {
    exerciseFailures,
    failRepairItemDetail = false,
  }: {
    exerciseFailures: boolean;
    failRepairItemDetail?: boolean;
  },
) {
  let ocrCount = 0;
  let structureCount = 0;
  let totalItemSaveCount = 0;
  let initialCaptureSaveCount = 0;
  let repairSaveCount = 0;
  let unknownItemSaveCount = 0;
  let unknownItemResponseCount = 0;
  let sourceLoadCount = 0;
  let repairItemLoadCount = 0;
  let queuePresentationLoadCount = 0;
  let durableRepairBinding: RepairPersistenceBinding | null = null;
  const initialCaptureResponseClasses: InitialCaptureResponseClass[] = [];
  const repairResponseClasses: RepairResponseClass[] = [];
  const mutations: string[] = [];
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== "GET") mutations.push(`${request.method()} ${url.pathname}`);

    if (request.method() === "GET" && url.pathname === `/api/os/items/${SOURCE_ITEM_ID}`) {
      sourceLoadCount += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, detail: syntheticDetail }) });
      return;
    }
    if (request.method() === "GET" && url.pathname === `/api/os/items/${REPAIR_ITEM_ID}`) {
      repairItemLoadCount += 1;
      if (failRepairItemDetail) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "synthetic_item_detail_unavailable" }),
        });
        return;
      }
      if (!durableRepairBinding) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "APP1_E2E_MISSING_DURABLE_BINDING" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          detail: syntheticRepairDetail(durableRepairBinding),
        }),
      });
      return;
    }
    if (request.method() === "POST" && url.pathname === "/api/inverge/ocr") {
      ocrCount += 1;
      if (exerciseFailures && ocrCount === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "synthetic_ocr_unavailable" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(captureExtraction()),
      });
      return;
    }
    if (request.method() === "POST" && url.pathname === "/api/answer-review/structure") {
      structureCount += 1;
      if (exerciseFailures && [1, 4].includes(structureCount)) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            error:
              structureCount === 1
                ? "synthetic_analysis_unavailable"
                : "synthetic_verification_unavailable",
          }),
        });
        return;
      }
      const paraphrasedUnresolved =
        exerciseFailures && structureCount === 5;
      const repairedReview = exerciseFailures
        ? structureCount >= 6
        : structureCount >= 2;
      const draft = paraphrasedUnresolved
        ? structureDraft({
            gap: "사안의 구체적 사실을 근거 기준과 결부하는 설명이 여전히 빠져 있습니다.",
            strengths: ["정의와 핵심 논거가 확인됩니다."],
            weakParagraphPoint: "결론 문장의 범위를 한정해 다시 적으세요.",
            weakLogicPoint: "결론 범위의 한정 근거를 확인해야 합니다.",
          })
        : repairedReview
          ? structureDraft({
              gap: "결론 문장의 범위를 한정할 필요가 있습니다.",
              strengths: [
                "사례 사실을 논거의 요건에 연결하여 결론을 도출했습니다.",
              ],
              weakParagraphPoint: "결론 문장의 범위를 한정해 다시 적으세요.",
              weakLogicPoint: "결론 범위의 한정 근거를 확인해야 합니다.",
            })
          : structureDraft();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, draft }),
      });
      return;
    }
    if (request.method() === "POST" && url.pathname === "/api/os/items") {
      totalItemSaveCount += 1;
      let submitted: unknown;
      try {
        submitted = request.postDataJSON();
      } catch {
        submitted = null;
      }
      const itemSaveClass = classifyItemSavePayload(submitted);
      if (itemSaveClass === "unknown_item_save" || !isPlainJsonRecord(submitted)) {
        unknownItemSaveCount += 1;
        unknownItemResponseCount += 1;
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "APP1_E2E_UNKNOWN_ITEM_SAVE_PAYLOAD" }),
        });
        return;
      }
      const confirmed = confirmedFieldsOf(submitted);
      if (!confirmed) {
        unknownItemSaveCount += 1;
        unknownItemResponseCount += 1;
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "APP1_E2E_UNKNOWN_ITEM_SAVE_PAYLOAD" }),
        });
        return;
      }

      if (itemSaveClass === "initial_capture_save") {
        initialCaptureSaveCount += 1;
        initialCaptureResponseClasses.push("synthetic_source_save_success");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            item: {
              id: SOURCE_ITEM_ID,
              updatedAt: "2026-08-29T02:00:00.000Z",
              rawPayload: {
                user_confirmed_fields: {
                  persistence_operation_id: confirmed.persistence_operation_id,
                  persistence_work_revision_id: confirmed.persistence_work_revision_id,
                },
              },
            },
          }),
        });
        return;
      }

      repairSaveCount += 1;
      if (exerciseFailures && repairSaveCount === 1) {
        repairResponseClasses.push("synthetic_repair_save_503");
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "synthetic_repair_save_unavailable" }),
        });
        return;
      }
      if (exerciseFailures && repairSaveCount === 2) {
        repairResponseClasses.push("synthetic_dedupe_conflict");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            deduped: true,
            item: {
              id: REPAIR_ITEM_ID,
              updatedAt: "2026-08-29T02:00:00.000Z",
              rawPayload: {
                user_confirmed_fields: {
                  persistence_operation_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                  persistence_work_revision_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                },
              },
            },
          }),
        });
        return;
      }
      const expectedDurableOrdinal = exerciseFailures ? 3 : 1;
      if (repairSaveCount !== expectedDurableOrdinal) {
        unknownItemResponseCount += 1;
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "APP1_E2E_UNEXPECTED_REPAIR_SAVE_COUNT" }),
        });
        return;
      }
      durableRepairBinding = {
        operationId: confirmed.persistence_operation_id as string,
        workRevisionId: confirmed.persistence_work_revision_id as string,
      };
      repairResponseClasses.push("synthetic_durable_success");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          item: {
            id: REPAIR_ITEM_ID,
            updatedAt: "2026-08-29T02:00:00.000Z",
            rawPayload: {
              user_confirmed_fields: {
                persistence_operation_id: confirmed.persistence_operation_id,
                persistence_work_revision_id: confirmed.persistence_work_revision_id,
              },
            },
          },
        }),
      });
      return;
    }
    if (request.method() === "GET" && url.pathname === "/api/os/review-queue") {
      queuePresentationLoadCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, items: [] }),
      });
      return;
    }
    await route.continue();
  });
  return {
    mutations,
    ocrCount: () => ocrCount,
    structureCount: () => structureCount,
    totalItemSaveCount: () => totalItemSaveCount,
    initialCaptureSaveCount: () => initialCaptureSaveCount,
    repairSaveCount: () => repairSaveCount,
    unknownItemSaveCount: () => unknownItemSaveCount,
    unknownItemResponseCount: () => unknownItemResponseCount,
    initialCaptureResponseClasses: () => [...initialCaptureResponseClasses],
    repairResponseClasses: () => [...repairResponseClasses],
    sourceLoadCount: () => sourceLoadCount,
    repairItemLoadCount: () => repairItemLoadCount,
    queuePresentationLoadCount: () => queuePresentationLoadCount,
  };
}

type CaptureInputKind = "text" | "photo" | "pdf";

async function completeCapture(
  page: Page,
  inputKind: CaptureInputKind,
  exerciseFailures: boolean,
) {
  await page.goto(
    "/app/capture?mode=second&subject=" + encodeURIComponent("감정평가이론"),
  );
  await expect(page.getByRole("button", { name: "사진·PDF·텍스트로 시작" })).toBeVisible();

  if (inputKind === "text") {
    await page.getByText("다른 입력 방식", { exact: true }).click();
    await page.getByRole("button", { name: "텍스트 붙여넣기" }).click();
    await page.getByLabel("오늘 공부한 내용 또는 내 답안").fill(
      "감정평가이론\n내 답안: 정의와 논거를 적었으나 적용 연결이 부족합니다.\n누락 논점: 사례 사실과 논거의 연결이 약합니다.",
    );
    await page.getByRole("button", { name: "입력 내용 확인하기" }).click();
  } else if (inputKind === "photo") {
    const photoInput = page.locator(
      'input[type="file"][accept="image/*"]:not([capture])',
    );
    await expect(photoInput).toHaveCount(1);
    await photoInput.setInputFiles({
      name: "synthetic-app1.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
    });
  } else {
    await page.getByText("다른 입력 방식", { exact: true }).click();
    await page.locator('input[type="file"][accept="application/pdf"]').setInputFiles({
      name: "synthetic-app1.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% synthetic fixture only\n%%EOF\n"),
    });
    await page.getByLabel("오늘 공부한 내용 또는 내 답안").fill(
      "감정평가이론\n내 답안: 정의와 논거를 적었으나 적용 연결이 부족합니다.\n누락 논점: 사례 사실과 논거의 연결이 약합니다.",
    );
    await page.getByRole("button", { name: "입력 내용 확인하기" }).click();
  }

  if (exerciseFailures) {
    await expect(page.getByText(/추출에 실패했습니다/)).toBeVisible();
    await page.getByRole("button", { name: "다시 만들기" }).click();
  }
  await expect(page.getByText("OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요.")).toBeVisible();
  const editableOcr = page.getByPlaceholder("OCR 결과를 확인하고 바로 수정하세요.");
  await expect(editableOcr).toBeEditable();
  await editableOcr.fill(
    "합성 사례의 정의와 논거, 적용 관계를 설명하시오. 학습자가 원문을 직접 확인했습니다.",
  );
  await page.getByRole("button", { name: "쟁점 회상부터 진행" }).click();
  await page.getByLabel("쟁점 회상").fill("정의와 논거, 사례 적용의 연결을 회상했습니다.");
  await page.getByRole("button", { name: "다음: 목차 작성" }).click();
  await page.getByLabel("목차 초안").fill("I. 정의\nII. 논거\nIII. 사례 적용\nIV. 결론");
  await page.getByRole("button", { name: "다음: 내 답안 작성" }).click();
  const answerPanel = page.locator('[data-s232e-second-write-panel="3"]');
  await expect(answerPanel).toHaveCount(1);
  await expect(answerPanel).toBeVisible();
  await expect(answerPanel.getByText("내 답안", { exact: true })).toBeVisible();
  const answerTextarea = answerPanel.getByRole("textbox");
  await expect(answerTextarea).toHaveCount(1);
  await expect(answerTextarea).toBeEditable();
  await answerTextarea.fill(
    "정의를 제시하고 논거를 설명했으나 사례 사실과 논거를 충분히 연결하지 못했다.",
  );
  await page.getByRole("button", { name: "다음: 강의/교재 정리 입력" }).click();
  await page.getByLabel("강의/교재 정리 요약").fill("정의와 논거 다음에 사례 적용과 결론을 연결한다.");
  await page.getByRole("button", { name: "다음: 가장 큰 약점 1개" }).click();
  await page.getByLabel("보강할 논점 1개").fill(originalGap);
  await page.getByRole("button", { name: "다음: 문단 다시쓰기" }).click();
  await page.getByLabel("다시 쓴 문단").fill(
    "사례의 합성 사실 A는 논거 B의 적용 대상이라는 연결을 학습자가 직접 작성했다.",
  );
  await page.getByRole("button", { name: "마지막 확인으로 이동" }).click();
  const [initialSaveResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/os/items",
    ),
    page.getByRole("button", { name: "저장하고 오늘 계획에 반영" }).click(),
  ]);
  expect(initialSaveResponse.status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`/app/capture/repair\\?itemId=${SOURCE_ITEM_ID}$`));
}

async function analyzeToDirectRepair(page: Page, keyboard: boolean) {
  const analyze = page.getByRole("button", { name: "이 내용으로 분석" });
  if (keyboard) {
    await analyze.focus();
    await expect(analyze).toBeFocused();
    await page.keyboard.press("Enter");
  } else {
    await analyze.click();
  }
  await expect(page.locator('[data-app1-primary-gap-count="1"]')).toHaveCount(1);
  await page.getByRole("button", { name: "직접 복구하기" }).click();
  await expect(page.getByLabel("내 복구 입력")).toHaveValue("");
}

test.skip(APP1_AUTH_RUNTIME !== "1", "requires local authenticated Owner/default-off APP-1 runtime");

test("synthetic Owner Capture → one-gap direct repair → durable next review is responsive and accessible", async ({ browser }) => {
  requireLocalRuntime();
  const viewports = [
    { width: 390, height: 844, keyboard: true, inputKind: "text" as const, exerciseFailures: true },
    { width: 768, height: 900, keyboard: false, inputKind: "photo" as const, exerciseFailures: false },
    { width: 1440, height: 1024, keyboard: false, inputKind: "pdf" as const, exerciseFailures: false },
  ];

  for (const viewport of viewports) {
    const context = await ownerContext(browser, viewport);
    const seams = await installSyntheticSeams(context, {
      exerciseFailures: viewport.exerciseFailures,
    });
    const page = await context.newPage();

    await completeCapture(page, viewport.inputKind, viewport.exerciseFailures);
    await assertNoHorizontalOverflow(page);
    await expect(page.getByRole("heading", { name: "Capture에서 직접 복구까지" })).toBeVisible();
    await expect(page.getByRole("button", { name: "이 내용으로 분석" })).toBeVisible();
    await assertA11y(page);

    if (viewport.exerciseFailures) {
      await page.getByRole("button", { name: "이 내용으로 분석" }).click();
      await expect(page.getByText(/분석을 완료하지 못했습니다/)).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Capture에서 직접 복구까지", exact: true }),
      ).toBeFocused();
    }
    await analyzeToDirectRepair(page, viewport.keyboard);
    const repair = page.getByLabel("내 복구 입력");
    if (viewport.exerciseFailures) {
      const unsavedSentinel = "저장되지 않은 합성 복구 입력은 새로고침 뒤 복원되면 안 됩니다.";
      await repair.fill(unsavedSentinel);
      await page.reload();
      await expect(page.getByRole("button", { name: "이 내용으로 분석" })).toBeVisible();
      await expect(page.getByText(unsavedSentinel)).toHaveCount(0);
      await analyzeToDirectRepair(page, viewport.keyboard);
    }
    if (viewport.keyboard) {
      await repair.focus();
      await page.keyboard.insertText(syntheticRepair);
      const verify = page.getByRole("button", { name: "복구 확인" });
      await verify.focus();
      await expect(verify).toBeFocused();
      await page.keyboard.press("Enter");
    } else {
      await repair.fill(syntheticRepair);
      await page.getByRole("button", { name: "복구 확인" }).click();
    }

    if (viewport.exerciseFailures) {
      await expect(page.getByText("복구 입력 검토를 완료하지 못했습니다. 성공으로 처리되지 않았습니다.")).toBeVisible();
      await expect(page.getByText("synthetic_verification_unavailable")).toHaveCount(0);
      await expect(repair).toHaveValue(syntheticRepair);
      await expect(page.locator("[data-app1-completed]")).toHaveCount(0);
      await page.getByRole("button", { name: "복구 확인" }).click();
      await expect(
        page.getByText("연결 1개가 아직 남아 있습니다"),
      ).toBeVisible();
      await expect(
        page.getByText("이 세션의 요청한 복구 1개가 확인되었습니다"),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "연결 1개 보강하기" }).click();
      await expect(repair).toHaveValue(syntheticRepair);
      await page.getByRole("button", { name: "복구 확인" }).click();
    }

    await expect(page.getByText("이 세션의 요청한 복구 1개가 확인되었습니다")).toBeVisible();
    await expect(page.getByText(/D\+7 전이·숙달·점수·합격 상태는 만들지 않습니다/)).toBeVisible();
    await page.getByRole("button", { name: "복구 결과 저장하고 다음 복습 만들기" }).click();
    if (viewport.exerciseFailures) {
      await expect(page.getByText("복구 기록 저장에 실패했습니다. 완료로 처리되지 않았습니다.")).toBeVisible();
      await expect(page.getByText("synthetic_repair_save_unavailable")).toHaveCount(0);
      await expect(page.locator("[data-app1-completed]")).toHaveCount(0);
      await expect(page.locator('[data-app1-persistence-receipt="durable"]')).toHaveCount(0);
      await expect(page.locator('[data-app1-queue-receipt="valid"]')).toHaveCount(0);
      await expect(page.getByText(/복구 기록과 다음 독립 행동이 저장되었습니다/)).toHaveCount(0);
      const retainedVerificationHeading = page.getByRole("heading", {
        name: "이 세션의 요청한 복구 1개가 확인되었습니다",
        exact: true,
      });
      await expect(retainedVerificationHeading).toHaveCount(1);
      await expect(retainedVerificationHeading).toBeVisible();
      const repairSaveRetry = page.getByRole("button", {
        name: "복구 결과 저장하고 다음 복습 만들기",
        exact: true,
      });
      await expect(repairSaveRetry).toHaveCount(1);
      await expect(repairSaveRetry).toBeVisible();
      await expect(repairSaveRetry).toBeEnabled();
      const saveFailureAlert = page.locator("[data-app1-error]");
      await expect(saveFailureAlert).toHaveCount(1);
      await expect(saveFailureAlert).toBeVisible();
      await expect(saveFailureAlert).toHaveAttribute("data-app1-conflict", "false");
      await repairSaveRetry.click();
      await expect(page.locator('[data-app1-conflict="true"]')).toBeVisible();
      await expect(page.getByText(/중복 성공으로 처리하지 않았습니다/)).toBeVisible();
      await expect(page.locator("[data-app1-completed]")).toHaveCount(0);
      await expect(page.locator('[data-app1-persistence-receipt="durable"]')).toHaveCount(0);
      await expect(page.locator('[data-app1-queue-receipt="valid"]')).toHaveCount(0);
      await page.getByRole("button", { name: "복구 결과 저장하고 다음 복습 만들기" }).click();
    }
    await expect(page.locator('[data-app1-persistence-receipt="durable"]')).toBeVisible();
    await expect(page.locator('[data-app1-queue-receipt="valid"]')).toBeVisible();
    await expect(page.getByText(/답을 보지 않고 보강한 연결을 다시 한 번 작성하기/)).toBeVisible();
    expect(seams.ocrCount()).toBe(viewport.exerciseFailures ? 2 : 1);
    expect(seams.structureCount()).toBe(viewport.exerciseFailures ? 6 : 2);
    expect(seams.repairSaveCount()).toBe(viewport.exerciseFailures ? 3 : 1);
    expect(seams.repairResponseClasses()).toEqual(
      viewport.exerciseFailures
        ? [
            "synthetic_repair_save_503",
            "synthetic_dedupe_conflict",
            "synthetic_durable_success",
          ]
        : ["synthetic_durable_success"],
    );
    expect(seams.unknownItemSaveCount()).toBe(0);
    expect(seams.unknownItemResponseCount()).toBe(0);
    expect(seams.initialCaptureSaveCount()).toBeGreaterThanOrEqual(1);
    expect(seams.initialCaptureResponseClasses()).toHaveLength(
      seams.initialCaptureSaveCount(),
    );
    expect(
      seams.initialCaptureResponseClasses().every(
        (responseClass) => responseClass === "synthetic_source_save_success",
      ),
    ).toBe(true);
    expect(seams.totalItemSaveCount()).toBe(
      seams.initialCaptureSaveCount() +
        seams.repairSaveCount() +
        seams.unknownItemSaveCount(),
    );
    expect(seams.sourceLoadCount()).toBeGreaterThanOrEqual(viewport.exerciseFailures ? 2 : 1);
    expect(seams.repairItemLoadCount()).toBe(1);
    expect(seams.queuePresentationLoadCount()).toBe(0);
    expect(new Set(seams.mutations.map((entry) => entry.replace(/^POST /u, "")))).toEqual(
      new Set(["/api/inverge/ocr", "/api/answer-review/structure", "/api/os/items"]),
    );
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await assertNoHorizontalOverflow(page);
    await assertA11y(page);
    await context.close();
  }

  const queueFailureContext = await ownerContext(browser, {
    width: 390,
    height: 844,
  });
  const queueFailureSeams = await installSyntheticSeams(queueFailureContext, {
    exerciseFailures: false,
    failRepairItemDetail: true,
  });
  const queueFailurePage = await queueFailureContext.newPage();
  await completeCapture(queueFailurePage, "text", false);
  await analyzeToDirectRepair(queueFailurePage, false);
  await queueFailurePage.getByLabel("내 복구 입력").fill(syntheticRepair);
  await queueFailurePage.getByRole("button", { name: "복구 확인" }).click();
  await expect(
    queueFailurePage.getByText("이 세션의 요청한 복구 1개가 확인되었습니다"),
  ).toBeVisible();
  await queueFailurePage
    .getByRole("button", { name: "복구 결과 저장하고 다음 복습 만들기" })
    .click();
  await expect(
    queueFailurePage.getByRole("heading", {
      name: "복구 기록은 저장됐지만 다음 복습을 확인하지 못했습니다",
    }),
  ).toBeVisible();
  await expect(
    queueFailurePage.getByRole("link", { name: "저장 기록 확인" }),
  ).toHaveAttribute(
    "href",
    `/app/items/${REPAIR_ITEM_ID}?mode=second`,
  );
  await expect(queueFailurePage.locator("[data-app1-completed]")).toHaveCount(0);
  await expect(
    queueFailurePage.locator('[data-app1-persistence-receipt="durable"]'),
  ).toHaveCount(1);
  await expect(
    queueFailurePage.locator('[data-app1-queue-receipt="valid"]'),
  ).toHaveCount(0);
  await expect(queueFailurePage.locator("[data-app1-error]")).toHaveCount(0);
  expect(queueFailureSeams.repairSaveCount()).toBe(1);
  expect(queueFailureSeams.repairResponseClasses()).toEqual([
    "synthetic_durable_success",
  ]);
  expect(queueFailureSeams.repairItemLoadCount()).toBe(1);
  expect(queueFailureSeams.queuePresentationLoadCount()).toBe(0);
  expect(queueFailureSeams.unknownItemSaveCount()).toBe(0);
  await queueFailureContext.close();
});
