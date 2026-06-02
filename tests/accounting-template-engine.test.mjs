import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateFromAccountingParseResult,
  buildAccountingDerivedMetadata,
  normalizeAccountingParseResultFromAi,
} from "../lib/review-os/accounting-template-engine.ts";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";
import fs from "node:fs";

const baseParse = {
  subject: "회계학",
  templateId: "accounting_ppe_depreciation",
  confidence: 0.9,
  extractedInputs: { cost: 1200000, salvageValue: 200000, usefulLifeYears: 5, months: 6 },
  extractedLabels: ["취득원가", "잔존가치", "내용연수", "감가상각비"],
  needsHumanConfirmation: false,
};

test("supported accounting template calculates deterministically", () => {
  const { validation, calculation } = calculateFromAccountingParseResult(baseParse, true);
  assert.equal(validation.ok, true);
  assert.equal(calculation?.source, "deterministic_template");
  assert.equal(calculation?.resultLabel, "감가상각비");
  assert.equal(calculation?.resultValue, 100000);
});

test("unsupported template does not calculate and degrades safely", () => {
  const { validation, calculation } = calculateFromAccountingParseResult({ ...baseParse, templateId: null, unsupportedReason: "graph question" }, true);
  assert.equal(calculation, null);
  assert.equal(validation.calculationRisk, "unsupported_template");
  assert.equal(validation.message, "아직 지원하지 않는 계산 유형입니다. OCR/분류 결과만 저장할 수 있습니다.");
});

test("low confidence blocks deterministic result until learner confirmation", () => {
  const lowConfidence = { ...baseParse, confidence: 0.51, needsHumanConfirmation: true };
  const blocked = calculateFromAccountingParseResult(lowConfidence, false);
  assert.equal(blocked.calculation, null);
  assert.equal(blocked.validation.calculationRisk, "low_confidence");

  const confirmed = calculateFromAccountingParseResult(lowConfidence, true);
  assert.equal(confirmed.validation.ok, true);
  assert.equal(confirmed.calculation?.resultValue, 100000);
});

test("unknown fabricated account label is rejected", () => {
  const { validation, calculation } = calculateFromAccountingParseResult({ ...baseParse, extractedLabels: ["취득원가", "AI창작계정"] }, true);
  assert.equal(calculation, null);
  assert.equal(validation.calculationRisk, "unknown_label");
  assert.deepEqual(validation.unknownLabels, ["AI창작계정"]);
});

test("editable input updates deterministic result", () => {
  const initial = calculateFromAccountingParseResult(baseParse, true).calculation;
  const edited = calculateFromAccountingParseResult({ ...baseParse, extractedInputs: { ...baseParse.extractedInputs, months: 12 } }, true).calculation;
  assert.equal(initial?.resultValue, 100000);
  assert.equal(edited?.resultValue, 200000);
});

test("invalid numeric input does not throw and returns calculation null", () => {
  let result;
  assert.doesNotThrow(() => {
    result = calculateFromAccountingParseResult(
      {
        ...baseParse,
        extractedInputs: { cost: "not-a-number", salvageValue: 200000, usefulLifeYears: 5 },
      },
      true,
    );
  });
  assert.equal(result?.calculation, null);
  assert.equal(result?.validation.ok, false);
  assert.equal(result?.validation.calculationRisk, "invalid_input");
  assert.equal(result?.validation.message, "입력값을 다시 확인해야 계산할 수 있습니다.");
});

test("CVP contribution margin <= 0 does not throw and returns calculation null", () => {
  let result;
  assert.doesNotThrow(() => {
    result = calculateFromAccountingParseResult(
      {
        subject: "회계학",
        templateId: "accounting_cost_volume_profit",
        confidence: 0.92,
        extractedInputs: { sellingPricePerUnit: 1000, variableCostPerUnit: 1000, fixedCosts: 50000 },
        extractedLabels: ["판매단가", "단위당 변동비", "고정비"],
        needsHumanConfirmation: false,
      },
      true,
    );
  });
  assert.equal(result?.calculation, null);
  assert.equal(result?.validation.ok, false);
  assert.equal(result?.validation.calculationRisk, "invalid_input");
});

test("economics zero price change does not throw and returns calculation null", () => {
  let result;
  assert.doesNotThrow(() => {
    result = calculateFromAccountingParseResult(
      {
        subject: "경제학",
        templateId: "economics_elasticity_basic",
        confidence: 0.9,
        extractedInputs: { quantityBefore: 100, quantityAfter: 120, priceBefore: 10, priceAfter: 10 },
        extractedLabels: ["수요량", "가격", "가격탄력성"],
        needsHumanConfirmation: false,
      },
      true,
    );
  });
  assert.equal(result?.calculation, null);
  assert.equal(result?.validation.ok, false);
  assert.equal(result?.validation.calculationRisk, "invalid_input");
});

test("LLM final answer text is ignored as calculation source", () => {
  const normalized = normalizeAccountingParseResultFromAi({
    ...baseParse,
    finalAnswerText: "정답은 999,999원입니다.",
    extractedInputs: baseParse.extractedInputs,
  });
  assert.equal("finalAnswerText" in normalized, false);
  const { calculation } = calculateFromAccountingParseResult(normalized, true);
  assert.equal(calculation?.resultValue, 100000);
  assert.equal(calculation?.source, "deterministic_template");
});

test("derived metadata excludes raw problem and OCR text", () => {
  const { validation } = calculateFromAccountingParseResult(baseParse, true);
  const metadata = buildAccountingDerivedMetadata(
    {
      ...baseParse,
      raw_ocr_text: "forbidden OCR",
      rawProblemText: "forbidden problem",
    },
    validation,
  );
  assert.deepEqual(Object.keys(metadata).sort(), ["calculationRisk", "confidence", "lowConfidenceFlag", "missingInputKeys", "subject", "templateId"].sort());
  assert.equal("raw_ocr_text" in metadata, false);
  assert.equal("rawProblemText" in metadata, false);
});

test("mobile template UI uses stacked cards and no horizontal overflow helper", () => {
  const source = fs.readFileSync(new URL("../components/review-os/accounting-template-card.tsx", import.meta.url), "utf8");
  assert.match(source, /AI는 유형과 숫자만 추출합니다\. 계산은 Inverge 템플릿이 수행합니다\./);
  assert.match(source, /grid gap-3 sm:grid-cols-2/);
  assert.doesNotMatch(source, /<table|overflow-x-auto|min-w-\[/);
});

test("today plan accounting template retry routes to template retry flow and remains capped", () => {
  const now = new Date("2026-05-31T00:00:00.000Z");
  const queue = [0, 1, 2, 3].map((index) => ({
    queueId: `q-${index}`,
    itemId: `item-${index}`,
    examName: "감정평가사 1차",
    subjectLabel: "회계학",
    problemTitle: `계산 문제 ${index}`,
    topicTag: "계산",
    mistakeType: "계산 실수",
    reviewReason: "산식 template 확인",
    dueAt: "2026-05-30T00:00:00.000Z",
    priorityScore: 90 - index,
    confidence: "중간",
    recurrenceCount: 1,
    status: "pending",
    itemCreatedAt: "2026-05-30T00:00:00.000Z",
    createdFromCapture: false,
  }));
  const tasks = buildTodayPlanTasks({ mode: "first", queue, items: [], learningSignals: [], now });
  assert.equal(tasks.length, 3);
  assert.equal(tasks[0]?.task_type, "accounting_template_retry");
  assert.deepEqual(tasks[0]?.primary_cta, { label: "계산 틀 재확인", hrefKind: "calculator_template" });
});

test("second-mode calculation task stays in second review flow instead of calculator template", () => {
  const now = new Date("2026-05-31T00:00:00.000Z");
  const queue = [
    {
      queueId: "q-second-calc",
      itemId: "item-second-calc",
      examName: "감정평가사 2차",
      subjectLabel: "감정평가실무",
      problemTitle: "수익환원법 계산 문제",
      topicTag: "계산",
      mistakeType: "단위 실수",
      reviewReason: "산식과 단위 재확인",
      dueAt: "2026-05-30T00:00:00.000Z",
      priorityScore: 90,
      confidence: "중간",
      recurrenceCount: 1,
      status: "pending",
      itemCreatedAt: "2026-05-30T00:00:00.000Z",
      createdFromCapture: false,
    },
  ];
  const tasks = buildTodayPlanTasks({ mode: "second", queue, items: [], learningSignals: [], now });
  assert.equal(tasks[0]?.task_type, "second_answer_rewrite");
  assert.notEqual(tasks[0]?.primary_cta.hrefKind, "calculator_template");
});

test("second-mode calculation task cannot produce first accounting calculator href", () => {
  const now = new Date("2026-05-31T00:00:00.000Z");
  const tasks = buildTodayPlanTasks({
    mode: "second",
    queue: [
      {
        queueId: "q-second-unit",
        itemId: "item-second-unit",
        examName: "감정평가사 2차",
        subjectLabel: "감정평가실무",
        problemTitle: "단위 환산 문제",
        topicTag: "단위",
        mistakeType: "계산 실수",
        reviewReason: "계산 근거 재작성",
        dueAt: "2026-05-30T00:00:00.000Z",
        priorityScore: 95,
        confidence: "중간",
        recurrenceCount: 1,
        status: "pending",
        itemCreatedAt: "2026-05-30T00:00:00.000Z",
        createdFromCapture: false,
      },
    ],
    items: [],
    learningSignals: [],
    now,
  });
  const appSource = fs.readFileSync(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  assert.equal(appSource.includes("/app/calculator?mode=first&context=accounting&focus=accounting_template"), true);
  assert.equal(appSource.includes("/app/calculator?mode=second&context=practice&focus=casio"), true);
  assert.notEqual(tasks[0]?.primary_cta.hrefKind, "calculator_template");
});
