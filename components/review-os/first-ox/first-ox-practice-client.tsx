"use client";

import { useId, useState } from "react";

import { CollapsibleDetails, InlineFeedback, LearnerProgressBar, SingleFocusCard } from "@/components/learner";
import { Button } from "@/components/ui/button";
import { APPRAISAL_FIRST_SUBJECTS } from "@/lib/review-os/types";
import {
  buildFirstOxLearningSignalInput,
  evaluateFirstOxAttempt,
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
  return { tone: "warning" as const, title: "모르는 선지는 개념 확인으로 연결합니다.", next: `${statement.conceptCandidate ?? statement.subject} 기준 1개를 확인합니다.` };
}

export function FirstOxPracticeClient() {
  const [subject, setSubject] = useState("민법");
  const [stem, setStem] = useState("다음 각 선지를 독립 O/X로 판단하세요.");
  const [choiceText, setChoiceText] = useState(SAMPLE_CHOICES.join("\n"));
  const [statements, setStatements] = useState<FirstExamStatement[]>(() => shuffleFirstOxStatements(normalizeFiveChoiceItemToStatements({ id: "sample-first-ox", subject: "민법", stem: "다음 각 선지를 독립 O/X로 판단하세요.", choices: SAMPLE_CHOICES, expectedOxByChoice: [...SAMPLE_EXPECTED], topicCandidate: "민법 선지 판단", conceptCandidate: "요건·효과·예외" })));
  const [index, setIndex] = useState(0);
  const [attemptByStatementId, setAttemptByStatementId] = useState<Record<string, OxAttempt>>({});
  const [savedStatus, setSavedStatus] = useState<string>("");

  const current = statements[index];
  const currentAttempt = current ? attemptByStatementId[current.id] : null;
  const answeredCount = Object.keys(attemptByStatementId).length;
  const feedback = current && currentAttempt ? feedbackCopy(current, currentAttempt) : null;
  const canNormalize = parseChoices(choiceText).length === 5;
  const storageKey = `first-ox-${useId()}`;

  function normalizeManualItem() {
    const next = shuffleFirstOxStatements(normalizeFiveChoiceItemToStatements({
      id: storageKey,
      subject,
      stem,
      choices: parseChoices(choiceText),
      topicCandidate: `${subject} O/X 선지`,
      conceptCandidate: "핵심 개념 확인",
    }));
    setStatements(next);
    setIndex(0);
    setAttemptByStatementId({});
    setSavedStatus("5개 선지를 독립 문장으로 나누었습니다. 기대 O/X는 직접 확인 전까지 학습 권위로 쓰지 않습니다.");
  }

  async function saveAttempt(statement: FirstExamStatement, attempt: OxAttempt) {
    const signal = buildFirstOxLearningSignalInput(statement, attempt);
    if (!signal) {
      setSavedStatus("알고 맞힌 선지는 복습 큐를 늘리지 않았습니다.");
      return;
    }

    try {
      const response = await fetch("/api/os/first-ox/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement, attempt }),
      });
      if (!response.ok) throw new Error("save failed");
      setSavedStatus("오늘 복습 신호에 연결했습니다.");
    } catch {
      window.localStorage.setItem(`inverge:${statement.id}:${attempt.createdAt}`, JSON.stringify({ statement, attempt, signal }));
      setSavedStatus("네트워크 문제로 기기 안에 임시 저장했습니다. 다시 접속하면 같은 선지를 재시도하세요.");
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
    setSavedStatus("");
  }

  return (
    <div className="space-y-5 overflow-x-hidden">
      <SingleFocusCard eyebrow="감정평가사 1차" title="O/X 역공학 연습" description="5지선다 위치를 외우지 않도록, 선지 하나씩만 판단합니다.">
        <div className="space-y-5">
          <LearnerProgressBar current={answeredCount} total={statements.length} label="선지 판단" helper="해설은 답한 뒤에만 열립니다." />

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

          {current ? (
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

          {savedStatus ? <p className="rounded-[var(--radius-md)] bg-[color:var(--surfaceQuiet)] px-4 py-3 text-sm leading-6 text-[color:var(--muted-strong)]">{savedStatus}</p> : null}
        </div>
      </SingleFocusCard>
    </div>
  );
}
