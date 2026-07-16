"use client";

import { useId, useRef, useState } from "react";

import { CollapsibleDetails, InlineFeedback, LearnerProgressBar, SingleFocusCard } from "@/components/learner";
import { ExecutionResultControls } from "@/components/review-os/execution-result-controls";
import { Button } from "@/components/ui/button";
import { APPRAISAL_FIRST_SUBJECTS } from "@/lib/review-os/types";
import {
  buildFirstOxConceptCardPayload,
  buildFirstOxLearningSignalInput,
  evaluateFirstOxAttempt,
  extractFirstExamFiveChoicesFromText,
  normalizeFiveChoiceItemToStatements,
  resolveFirstOxLearningSignalKind,
  shuffleFirstOxStatements,
  type FirstExamStatement,
  type OxAttempt,
  type OxCertainty,
  type OxValue,
} from "@/lib/review-os/first-ox-engine";

const SAMPLE_CHOICES = [
  "① 취소할 수 있는 법률행위는 추인 전에도 무효로 확정된다.",
  "② 원칙적으로 의사무능력자의 법률행위는 무효이다.",
  "③ 일부 무효의 법리는 언제나 나머지 부분까지 전부 무효로 만든다.",
  "④ 점유자는 소유의 의사로 평온·공연하게 점유한 것으로 추정할 수 있다.",
  "⑤ 원시취득과 승계취득은 권리 승계 여부에서 구별된다.",
];

const SAMPLE_EXPECTED = ["X", "O", "X", "O", "O"] as const;

const BUTTONS: Array<{ label: string; userOx: OxValue; certainty: OxCertainty }> = [
  { label: "O + 확실함", userOx: "O", certainty: "certain" },
  { label: "X + 확실함", userOx: "X", certainty: "certain" },
  { label: "O + 헷갈림", userOx: "O", certainty: "confused" },
  { label: "X + 헷갈림", userOx: "X", certainty: "confused" },
  { label: "모름", userOx: "unknown", certainty: "unknown" },
];

function highlightTrapWords(text: string, trapWords: string[]) {
  if (trapWords.length === 0) return text;
  const escaped = trapWords.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "g");
  return text.split(pattern).map((part, index) => trapWords.includes(part) ? (
    <mark key={`${part}-${index}`} className="rounded bg-[color:var(--cue-review-bg)] px-1 py-0.5 text-[color:var(--foreground-strong)]">
      {part}
    </mark>
  ) : part);
}

function conceptReasonLabel(attempt: OxAttempt) {
  if (attempt.result === "incorrect") return "왜 틀렸는지";
  if (attempt.certainty === "confused") return "왜 흔들렸는지";
  return "판단 기준 확인";
}

function preferredExpressionTrap(trapWords: string[]) {
  if (trapWords.includes("원칙적으로")) return "원칙적으로";
  return trapWords.find((word) => ["원칙", "예외", "항상", "언제나", "할 수 있다", "하여야 한다", "전부", "일부"].includes(word));
}

function preferredLegalConcept(trapWords: string[]) {
  if (trapWords.includes("무효")) return "무효";
  if (trapWords.includes("취소")) return "취소";
  return null;
}

function reviewFocusLabel(statement: FirstExamStatement) {
  if (statement.statementText.includes("의사무능력자") && statement.statementText.includes("무효")) return "의사능력 유무와 무효 효과";
  return statement.conceptCandidate ?? statement.subject;
}

function ConceptPopup({ statement, attempt }: { statement: FirstExamStatement; attempt: OxAttempt }) {
  const concept = buildFirstOxConceptCardPayload(statement, attempt);
  if (!concept) return null;
  const legalConcept = preferredLegalConcept(concept.trapWords);
  const expressionTrap = preferredExpressionTrap(concept.trapWords);

  return (
    <aside className="space-y-3 rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-4 text-sm leading-7 text-[color:var(--foreground-strong)]">
      <p className="text-xs font-medium text-[color:var(--muted)]">개념 1개만 확인</p>
      <div className="grid gap-3">
        <div>
          <p className="text-xs text-[color:var(--muted)]">{conceptReasonLabel(attempt)}</p>
          <p>{concept.minimalExplanation}</p>
        </div>
        <div>
          <p className="text-xs text-[color:var(--muted)]">핵심 법률개념</p>
          <p>{legalConcept ?? concept.coreRule}</p>
          {legalConcept ? <p className="mt-1 text-xs leading-6 text-[color:var(--muted)]">{concept.coreRule}</p> : null}
        </div>
        <div>
          <p className="text-xs text-[color:var(--muted)]">표현 함정</p>
          <p>{expressionTrap ?? (concept.trapWords.length > 0 ? concept.trapWords.join(" · ") : "조건 표현 1개")}</p>
        </div>
        <div>
          <p className="text-xs text-[color:var(--muted)]">다음 행동</p>
          <p>{concept.nextReviewAction}</p>
        </div>
      </div>
      <details className="text-xs leading-6 text-[color:var(--muted)]">
        <summary className="cursor-pointer">세부 설명 보기</summary>
        <p className="mt-2">{concept.examTrapExplanation}</p>
      </details>
      <details className="text-xs leading-6 text-[color:var(--muted)]">
        <summary className="cursor-pointer">빈출 표현 기준 보기 (선택)<span className="sr-only">참고 근거 힌트 보기 (선택)</span></summary>
        {concept.referenceSnippets?.length ? (
          <ul className="mt-2 space-y-2">
            {concept.referenceSnippets.slice(0, 2).map((snippet) => (
              <li key={snippet.referenceId} className="rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface)] p-2">
                <p className="font-medium text-[color:var(--foreground-strong)]">{snippet.title}</p>
                <p className="mt-1">{snippet.snippet}</p>
                {snippet.citationLabel ? <p className="mt-1">{snippet.citationLabel}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2">필요할 때만 신뢰 기준을 짧게 확인합니다.</p>
        )}
      </details>
    </aside>
  );
}

function parseChoices(value: string) {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function feedbackCopy(statement: FirstExamStatement, attempt: OxAttempt) {
  const kind = resolveFirstOxLearningSignalKind(attempt);
  if (kind === "none") return { tone: "correct" as const, title: "알고 맞힌 선지는 큐에 넣지 않습니다.", next: "다음 선지로 넘어갑니다." };
  if (kind === "wrong_answer_retry") return { tone: "incorrect" as const, title: "판단이 달랐습니다. 근거 1줄을 다시 고정합니다.", next: "이 선지는 재시도 신호로 저장됩니다." };
  if (kind === "weak_confidence") return { tone: "warning" as const, title: "맞혔지만 헷갈린 선지입니다.", next: "약한 확신 신호로 저장됩니다." };
  return { tone: "warning" as const, title: "모르는 선지는 개념 확인으로 연결합니다.", next: `${reviewFocusLabel(statement)} 기준 1개를 확인합니다.` };
}

export type FirstOxPracticeSourceKind = "capture" | "manual" | "retry" | "generic";

export type FirstOxPracticeClientProps = {
  initialStatements?: FirstExamStatement[];
  initialSubject?: string;
  initialStem?: string;
  initialChoiceText?: string;
  retrySourceItemId?: string;
  retryLoadStatus?: "loaded" | "generic";
  sourceKind?: FirstOxPracticeSourceKind;
  sourceLoadStatus?: "loaded" | "unclear" | "generic";
};

type AttemptSaveState = Readonly<{
  attemptCreatedAt: string;
  status: "saving" | "saved" | "not_queued" | "unavailable";
}>;

function buildSampleStatements() {
  return shuffleFirstOxStatements(normalizeFiveChoiceItemToStatements({
    id: "sample-first-ox",
    subject: "민법",
    stem: "다음 각 선지를 독립 O/X로 판단하세요.",
    choices: SAMPLE_CHOICES,
    expectedOxByChoice: [...SAMPLE_EXPECTED],
    topicCandidate: "민법 선지 판단",
    conceptCandidate: "요건·효과·예외",
  }));
}

export function FirstOxPracticeClient({
  initialStatements,
  initialSubject,
  initialStem,
  initialChoiceText,
  retrySourceItemId,
  retryLoadStatus,
  sourceKind = retryLoadStatus === "loaded" ? "retry" : initialStatements?.length ? "manual" : "generic",
  sourceLoadStatus = "generic",
}: FirstOxPracticeClientProps = {}) {
  const retryStatements = initialStatements?.length ? initialStatements : null;
  const initialNeedsConfirmation = sourceKind === "capture";
  const isGenericSource = sourceKind === "generic";
  const [subject, setSubject] = useState(initialSubject ?? retryStatements?.[0]?.subject ?? "민법");
  const [stem, setStem] = useState(
    initialStem ??
      retryStatements?.[0]?.stem ??
      (isGenericSource ? "다음 각 선지를 독립 O/X로 판단하세요." : ""),
  );
  const [choiceText, setChoiceText] = useState(
    initialChoiceText ??
      retryStatements?.map((statement) => statement.statementText).join("\n") ??
      (isGenericSource ? SAMPLE_CHOICES.join("\n") : ""),
  );
  const [statements, setStatements] = useState<FirstExamStatement[]>(() =>
    retryStatements ?? (isGenericSource ? buildSampleStatements() : []),
  );
  const [index, setIndex] = useState(0);
  const [attemptByStatementId, setAttemptByStatementId] = useState<Record<string, OxAttempt>>({});
  const [saveStateByStatementId, setSaveStateByStatementId] = useState<Record<string, AttemptSaveState>>({});
  const [captureConfirmed, setCaptureConfirmed] = useState(!initialNeedsConfirmation);
  const [activeSourceKind, setActiveSourceKind] = useState<FirstOxPracticeSourceKind>(sourceKind);
  const saveGenerationRef = useRef(0);

  const current = statements[index];
  const currentAttempt = current ? attemptByStatementId[current.id] : null;
  const currentSaveState = current ? saveStateByStatementId[current.id] : null;
  const answeredCount = Object.keys(attemptByStatementId).length;
  const feedback = current && currentAttempt ? feedbackCopy(current, currentAttempt) : null;
  const extractedChoices = extractFirstExamFiveChoicesFromText(choiceText, subject);
  const canNormalize = extractedChoices.status === "detected" && extractedChoices.choices.length === 5;
  const generatedStorageId = useId();
  const storageKey = `first-ox-${retrySourceItemId ?? generatedStorageId}`;

  function normalizeManualItem() {
    const next = shuffleFirstOxStatements(normalizeFiveChoiceItemToStatements({
      id: storageKey,
      subject,
      stem,
      choices: extractedChoices.status === "detected" ? extractedChoices.choices : parseChoices(choiceText),
      topicCandidate: `${subject} O/X 선지`,
      conceptCandidate: "핵심 개념 확인",
    }));
    setStatements(next);
    setIndex(0);
    setAttemptByStatementId({});
    setSaveStateByStatementId({});
    saveGenerationRef.current += 1;
    setCaptureConfirmed(true);
    setActiveSourceKind(sourceKind === "capture" ? "capture" : "manual");
  }

  function updateAttemptSaveState(
    statementId: string,
    attemptCreatedAt: string,
    status: AttemptSaveState["status"],
    generation: number,
  ) {
    if (saveGenerationRef.current !== generation) return;
    setSaveStateByStatementId((previous) => {
      const currentState = previous[statementId];
      if (currentState && currentState.attemptCreatedAt !== attemptCreatedAt) {
        return previous;
      }
      return {
        ...previous,
        [statementId]: Object.freeze({ attemptCreatedAt, status }),
      };
    });
  }

  async function saveAttempt(statement: FirstExamStatement, attempt: OxAttempt) {
    const generation = saveGenerationRef.current;
    const signal = buildFirstOxLearningSignalInput(statement, attempt);
    if (!signal) {
      updateAttemptSaveState(statement.id, attempt.createdAt, "not_queued", generation);
      return;
    }

    updateAttemptSaveState(statement.id, attempt.createdAt, "saving", generation);
    try {
      const response = await fetch("/api/os/first-ox/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement, attempt }),
      });
      const receipt = await response.json();
      if (
        !response.ok ||
        !receipt ||
        typeof receipt !== "object" ||
        Array.isArray(receipt) ||
        receipt.ok !== true ||
        receipt.saved !== true
      ) {
        throw new Error("unconfirmed-first-ox-save");
      }
      updateAttemptSaveState(statement.id, attempt.createdAt, "saved", generation);
    } catch {
      updateAttemptSaveState(statement.id, attempt.createdAt, "unavailable", generation);
    }
  }

  function answer(userOx: OxValue, certainty: OxCertainty) {
    if (!current || currentAttempt) return;
    const attempt = evaluateFirstOxAttempt(current, userOx, certainty);
    setAttemptByStatementId((prev) => ({ ...prev, [current.id]: attempt }));
    void saveAttempt(current, attempt);
  }

  function goNext() {
    setIndex((prev) => Math.min(prev + 1, statements.length - 1));
  }

  const currentSaveStatusCopy = currentSaveState
    ? {
        saving: "복습 신호의 저장 결과를 확인하고 있습니다.",
        saved: "오늘 복습 신호에 연결했습니다.",
        not_queued: "알고 맞힌 선지는 복습 큐를 늘리지 않았습니다.",
        unavailable:
          "저장 여부를 확인하지 못했습니다. 이 응답은 현재 화면에만 남아 있으며 저장 완료로 표시하지 않습니다.",
      }[currentSaveState.status]
    : null;

  return (
    <div className="space-y-5 overflow-x-hidden">
      <SingleFocusCard eyebrow="감정평가사 1차" title="O/X 역공학 연습" description="5지선다 위치를 외우지 않도록, 선지 하나씩만 판단합니다.">
        <div className="space-y-5">
          {statements.length > 0 ? (
            <LearnerProgressBar current={answeredCount} total={statements.length} label="선지 판단" helper="해설은 답한 뒤에만 열립니다." />
          ) : null}

          {activeSourceKind === "capture" && sourceLoadStatus === "loaded" ? (
            <p className="rounded-[var(--radius-md)] bg-[color:var(--surfaceQuiet)] px-4 py-3 text-sm leading-6 text-[color:var(--muted-strong)]">오늘 올린 문제에서 선지 5개를 나누었습니다.</p>
          ) : retryLoadStatus === "loaded" ? (
            <p className="rounded-[var(--radius-md)] bg-[color:var(--surfaceQuiet)] px-4 py-3 text-sm leading-6 text-[color:var(--muted-strong)]">저장된 선지를 다시 판단합니다.</p>
          ) : activeSourceKind === "manual" ? (
            <p className="rounded-[var(--radius-md)] bg-[color:var(--surfaceQuiet)] px-4 py-3 text-sm leading-6 text-[color:var(--muted-strong)]">직접 붙여넣은 선지를 O/X로 판단합니다.</p>
          ) : sourceLoadStatus === "unclear" ? (
            <p className="rounded-[var(--radius-md)] bg-[color:var(--surfaceQuiet)] px-4 py-3 text-sm leading-6 text-[color:var(--muted-strong)]">선지 5개를 확실히 찾지 못했습니다. 직접 확인 후 O/X로 나눌 수 있습니다.</p>
          ) : null}

          {sourceKind === "capture" ? (
            <section className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4 sm:p-5">
              <p className="text-xs font-medium text-[color:var(--muted)]">Capture-to-OX 확인</p>
              <h2 className="mt-1 text-lg font-semibold text-[color:var(--foreground-strong)]">확인하고 O/X 연습 시작</h2>
              <div className="mt-3 grid gap-3">
                <label className="block text-xs font-medium text-[color:var(--muted)]" htmlFor="first-ox-capture-subject">감지된 과목</label>
                <select id="first-ox-capture-subject" value={subject} onChange={(event) => setSubject(event.target.value)} className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 text-sm">
                  {APPRAISAL_FIRST_SUBJECTS.map((item) => <option key={item}>{item}</option>)}
                </select>
                <label className="block text-xs font-medium text-[color:var(--muted)]" htmlFor="first-ox-capture-stem">감지된 문제 줄기</label>
                <textarea id="first-ox-capture-stem" value={stem} onChange={(event) => setStem(event.target.value)} className="min-h-20 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[color:var(--bg-surface)] p-3 text-sm" />
                <label className="block text-xs font-medium text-[color:var(--muted)]" htmlFor="first-ox-capture-choices">감지된 선지 5개</label>
                <textarea id="first-ox-capture-choices" value={choiceText} onChange={(event) => setChoiceText(event.target.value)} className="min-h-40 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[color:var(--bg-surface)] p-3 text-sm" />
                {!canNormalize ? <p className="text-sm text-[color:var(--muted)]">선지 5개를 확실히 찾지 못했습니다. 직접 확인 후 O/X로 나눌 수 있습니다.</p> : null}
                <Button type="button" disabled={!canNormalize} onClick={normalizeManualItem} className="w-full sm:w-auto">확인하고 O/X 연습 시작</Button>
              </div>
            </section>
          ) : null}

          <CollapsibleDetails title="5지선다 직접 붙여넣기" helper="선지 번호는 저장하지 않고 5개 독립 문장으로만 다룹니다.">
            <div className="space-y-3">
              <label className="block text-xs font-medium text-[color:var(--muted)]" htmlFor="first-ox-subject">과목</label>
              <select id="first-ox-subject" value={subject} onChange={(event) => setSubject(event.target.value)} className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 text-sm">
                {APPRAISAL_FIRST_SUBJECTS.map((item) => <option key={item}>{item}</option>)}
              </select>
              <label className="block text-xs font-medium text-[color:var(--muted)]" htmlFor="first-ox-stem">문제 줄기</label>
              <textarea id="first-ox-stem" value={stem} onChange={(event) => setStem(event.target.value)} className="min-h-20 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[color:var(--bg-surface)] p-3 text-sm" />
              <label className="block text-xs font-medium text-[color:var(--muted)]" htmlFor="first-ox-choices">선지 5개</label>
              <textarea id="first-ox-choices" value={choiceText} onChange={(event) => setChoiceText(event.target.value)} className="min-h-40 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[color:var(--bg-surface)] p-3 text-sm" />
              <Button type="button" disabled={!canNormalize} onClick={normalizeManualItem} className="w-full sm:w-auto">5개 O/X 선지로 나누기</Button>
            </div>
          </CollapsibleDetails>

          {current && captureConfirmed ? (
            <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4 sm:p-5">
              <p className="text-xs text-[color:var(--muted)]">현재 선지</p>
              <p className="break-keep text-xl font-semibold leading-9 tracking-[-0.03em] text-[color:var(--foreground-strong)]">
                {currentAttempt ? highlightTrapWords(current.statementText, current.trapWords) : current.statementText}
              </p>
              {!currentAttempt ? (
                <div className="grid gap-2">
                  {BUTTONS.map((item) => (
                    <Button key={item.label} type="button" variant="outline" className="min-h-12 w-full justify-center text-base" onClick={() => answer(item.userOx, item.certainty)}>
                      {item.label}
                    </Button>
                  ))}
                </div>
              ) : null}
              {feedback && currentAttempt ? (
                <InlineFeedback tone={feedback.tone} title={feedback.title}>
                  <p>{feedback.next}</p>
                  {current.trapWords.length > 0 ? <p className="mt-1">주의 표현: {current.trapWords.join(" · ")}</p> : <p className="mt-1">표시할 함정어는 없습니다.</p>}
                </InlineFeedback>
              ) : null}
              {currentAttempt && resolveFirstOxLearningSignalKind(currentAttempt) !== "none" ? <ConceptPopup statement={current} attempt={currentAttempt} /> : null}
              {currentAttempt ? (
                <ExecutionResultControls
                  examMode="first"
                  executionSource="first_ox"
                  subjectName={current.subject}
                  taskType="O/X"
                  unitName={reviewFocusLabel(current)}
                />
              ) : null}
              {currentAttempt ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={goNext} disabled={index >= statements.length - 1} className="w-full sm:w-auto">
                    다음 선지
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIndex(0)} className="w-full sm:w-auto">
                    처음 선지로 돌아가기
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}

          {currentSaveStatusCopy ? (
            <p
              className="rounded-[var(--radius-md)] bg-[color:var(--surfaceQuiet)] px-4 py-3 text-sm leading-6 text-[color:var(--muted-strong)]"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              data-s232f6-attempt-save-status={currentSaveState?.status}
            >
              {currentSaveStatusCopy}
            </p>
          ) : null}
        </div>
      </SingleFocusCard>
    </div>
  );
}
