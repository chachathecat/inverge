"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APPRAISAL_FIRST_SUBJECTS,
  CONFIDENCE_OPTIONS,
  FIRST_STAGE_ERROR_REASON_OPTIONS,
  getFirstSubjectTemplate,
  type ConfidenceLevel,
  type WrongAnswerItemInput,
} from "@/lib/review-os/types";

type Step = "setup" | "answers" | "result" | "wrong-details" | "done";

type AnswerRow = {
  questionNumber: number;
  userAnswer: string;
  correctAnswer: string;
};

type FirstStageErrorReason = (typeof FIRST_STAGE_ERROR_REASON_OPTIONS)[number];

type WrongDetailRow = {
  questionNumber: number;
  userAnswer: string;
  correctAnswer: string;
  errorReason: FirstStageErrorReason | "";
  retrievalSentence: string;
};

function normalizeAnswer(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeChoiceToken(value: string) {
  const trimmed = normalizeAnswer(value)
    .replace(/[()]/g, "")
    .replace(/번$/u, "");
  const map: Record<string, string> = {
    "①": "1",
    "②": "2",
    "③": "3",
    "④": "4",
    "⑤": "5",
    "❶": "1",
    "❷": "2",
    "❸": "3",
    "❹": "4",
    "❺": "5",
  };
  return map[trimmed] ?? trimmed;
}

function parseBulkAnswers(value: string) {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const hasExplicitDelimiters = /[,\n/|;]/.test(normalized);

  if (hasExplicitDelimiters) {
    return normalized.split(/[,\n/|;]/g).map((token) => normalizeChoiceToken(token));
  }

  return normalized
    .split(/\s+/g)
    .map((token) => normalizeChoiceToken(token))
    .filter((token) => token.length > 0);
}

function getIsCorrect(userAnswer: string, correctAnswer: string) {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  return normalizedUser.length > 0 && normalizedCorrect.length > 0 && normalizedUser === normalizedCorrect;
}

type FirstSetSolvingFormProps = {
  initialSubject?: string;
};

export function FirstSetSolvingForm({ initialSubject }: FirstSetSolvingFormProps) {
  const [step, setStep] = useState<Step>("setup");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [subject, setSubject] = useState<(typeof APPRAISAL_FIRST_SUBJECTS)[number]>(() => {
    if (initialSubject && APPRAISAL_FIRST_SUBJECTS.includes(initialSubject as (typeof APPRAISAL_FIRST_SUBJECTS)[number])) {
      return initialSubject as (typeof APPRAISAL_FIRST_SUBJECTS)[number];
    }
    return APPRAISAL_FIRST_SUBJECTS[0];
  });
  const [setTitle, setSetTitle] = useState("");
  const [questionCount, setQuestionCount] = useState("5");
  const [timeSpentSeconds, setTimeSpentSeconds] = useState("");
  const [confidence, setConfidence] = useState<ConfidenceLevel>("중간");

  const [answerRows, setAnswerRows] = useState<AnswerRow[]>([]);
  const [bulkUserAnswers, setBulkUserAnswers] = useState("");
  const [bulkCorrectAnswers, setBulkCorrectAnswers] = useState("");
  const [wrongDetails, setWrongDetails] = useState<WrongDetailRow[]>([]);
  const [createdCount, setCreatedCount] = useState(0);
  const subjectTemplate = useMemo(() => getFirstSubjectTemplate(subject), [subject]);

  const summary = useMemo(() => {
    const total = answerRows.length;
    const correct = answerRows.filter((row) => getIsCorrect(row.userAnswer, row.correctAnswer)).length;
    const wrong = total - correct;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, correct, wrong, accuracy };
  }, [answerRows]);
  const biggestSignal = useMemo(() => {
    if (wrongDetails.length === 0) return "정답 근거를 유지했습니다.";
    const counts = wrongDetails.reduce<Record<string, number>>((acc, row) => {
      if (!row.errorReason) return acc;
      acc[row.errorReason] = (acc[row.errorReason] ?? 0) + 1;
      return acc;
    }, {});
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? `${top[0]}이 반복됐습니다.` : "해설 전 회상 문장을 더 짧게 고정하면 좋습니다.";
  }, [wrongDetails]);

  function handleSetupNext() {
    const parsedCount = Number(questionCount);
    if (!setTitle.trim()) {
      setErrorMessage("세트 제목 또는 출처 라벨을 입력해 주세요.");
      return;
    }
    if (!Number.isFinite(parsedCount) || parsedCount < 1 || parsedCount > 30) {
      setErrorMessage("문항 수는 1~30 사이로 입력해 주세요.");
      return;
    }

    const rows: AnswerRow[] = Array.from({ length: parsedCount }, (_, index) => ({
      questionNumber: index + 1,
      userAnswer: "",
      correctAnswer: "",
    }));
    setAnswerRows(rows);
    setWrongDetails([]);
    setErrorMessage("");
    setStep("answers");
  }

  function updateAnswerRow(questionNumber: number, key: "userAnswer" | "correctAnswer", value: string) {
    setAnswerRows((prev) => prev.map((row) => (row.questionNumber === questionNumber ? { ...row, [key]: value } : row)));
  }

  function handleApplyBulkInput() {
    const userTokens = parseBulkAnswers(bulkUserAnswers);
    const correctTokens = parseBulkAnswers(bulkCorrectAnswers);
    const expectedCount = answerRows.length;

    if (userTokens.length !== expectedCount || correctTokens.length !== expectedCount) {
      setErrorMessage(`입력 개수를 확인해 주세요. 문항 수는 ${expectedCount}개입니다.`);
      return;
    }
    if (userTokens.some((token) => !token) || correctTokens.some((token) => !token)) {
      setErrorMessage("비어 있는 답이 있습니다. 빠진 문항을 확인해 주세요.");
      return;
    }

    setAnswerRows((prev) =>
      prev.map((row, index) => ({
        ...row,
        userAnswer: userTokens[index] ?? "",
        correctAnswer: correctTokens[index] ?? "",
      })),
    );
    setErrorMessage("");
  }

  function handleCheckAnswers() {
    if (answerRows.some((row) => !normalizeAnswer(row.userAnswer) || !normalizeAnswer(row.correctAnswer))) {
      setErrorMessage("모든 문항에 내 답과 정답을 입력해 주세요.");
      return;
    }

    const wrongRows: WrongDetailRow[] = answerRows
      .filter((row) => !getIsCorrect(row.userAnswer, row.correctAnswer))
      .map((row) => ({
        questionNumber: row.questionNumber,
        userAnswer: normalizeAnswer(row.userAnswer),
        correctAnswer: normalizeAnswer(row.correctAnswer),
        errorReason: "",
        retrievalSentence: "",
      }));

    setWrongDetails(wrongRows);
    setErrorMessage("");
    setStep("result");
  }

  function handleResultNext() {
    if (summary.wrong === 0) {
      setStep("done");
      return;
    }
    setStep("wrong-details");
  }

  function updateWrongDetail(questionNumber: number, key: "errorReason" | "retrievalSentence", value: string) {
    setWrongDetails((prev) => prev.map((row) => (row.questionNumber === questionNumber ? { ...row, [key]: value } : row)));
  }

  async function handleCreateWrongAnswers() {
    if (
      wrongDetails.some(
        (row) => !FIRST_STAGE_ERROR_REASON_OPTIONS.includes(row.errorReason as FirstStageErrorReason),
      )
    ) {
      setErrorMessage("틀린 문항마다 공식 오답 이유를 선택해 주세요.");
      return;
    }
    if (wrongDetails.some((row) => row.retrievalSentence.trim().length < 4)) {
      setErrorMessage("틀린 문항마다 회상 문장을 한 문장으로 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      let successCount = 0;
      for (const row of wrongDetails) {
        const payload: WrongAnswerItemInput = {
          examName: "감정평가사 1차",
          subjectLabel: subject,
          sourceType: "manual",
          sourceLabel: setTitle.trim(),
          problemTitle: `${setTitle.trim()} ${row.questionNumber}번 문항`,
          problemIdentifier: `set-q-${row.questionNumber}`,
          rawQuestionText: `세트 풀이 기록\n세트명: ${setTitle.trim()}\n문항 번호: ${row.questionNumber}`,
          correctAnswer: row.correctAnswer,
          userAnswer: row.userAnswer,
          userReasonText: `${row.questionNumber}번 문항에서 ${row.errorReason}`,
          userReasonPreset: row.errorReason,
          confidence,
          timeSpentSeconds: timeSpentSeconds.trim() ? Number(timeSpentSeconds) : undefined,
          comparisonPoint: row.retrievalSentence.trim(),
          keyConcepts: [subject, "세트 풀이"],
          extractionPayload: {
            raw_ocr_text: "",
            raw_extraction_json: {},
            normalized_draft: null,
            user_confirmed_fields: {
              source_kind: "first_stage_set",
              set_title: setTitle.trim(),
              set_subject: subject,
              set_question_count: summary.total,
              question_number: row.questionNumber,
              user_answer: row.userAnswer,
              correct_answer: row.correctAnswer,
              error_reason: row.errorReason,
              retrieval_sentence: row.retrievalSentence.trim(),
              time_spent_seconds: timeSpentSeconds.trim() ? Number(timeSpentSeconds) : null,
            },
          },
        };

        const response = await fetch("/api/os/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = (await response.json().catch(() => null)) as { ok?: boolean } | null;
        if (!response.ok || !result?.ok) {
          setErrorMessage("오답 기록 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
        successCount += 1;
      }

      setCreatedCount(successCount);
      setStep("done");
    } catch {
      setErrorMessage("오답 기록 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-none">
      <CardHeader className="space-y-3 p-4 sm:p-6">
        <p className="text-caption text-[color:var(--muted)]">감정평가사 1차 · Set Solving Engine v1</p>
        <CardTitle>오늘은 작은 세트 하나만 풉니다.</CardTitle>
        <CardDescription>틀린 문항만 다시 보고, 해설 전에 이유를 한 문장으로 떠올립니다.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 p-4 pt-0 sm:p-6 sm:pt-0">
        {step === "setup" ? (
          <section className="space-y-4">
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-[color:var(--foreground-strong)]">과목</span>
              <select
                value={subject}
                onChange={(event) => setSubject(event.target.value as (typeof APPRAISAL_FIRST_SUBJECTS)[number])}
                className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2"
              >
                {APPRAISAL_FIRST_SUBJECTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-[var(--radius-md)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] p-3">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">이 과목은 먼저 이 기준으로 확인합니다.</p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">{subjectTemplate.checkpoints.join(" · ")}</p>
              <p className="mt-2 text-xs text-[color:var(--muted)]">해설 전에 이 기준 중 하나를 떠올립니다.</p>
              <p className="text-xs text-[color:var(--muted)]">{subjectTemplate.fixedCondition}</p>
            </div>

            <label className="block space-y-2 text-sm">
              <span className="font-medium text-[color:var(--foreground-strong)]">세트 제목/출처</span>
              <input
                value={setTitle}
                onChange={(event) => setSetTitle(event.target.value)}
                placeholder="예: 2026 1회 모의고사"
                className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2"
              />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="font-medium text-[color:var(--foreground-strong)]">문항 수</span>
              <input
                value={questionCount}
                onChange={(event) => setQuestionCount(event.target.value)}
                inputMode="numeric"
                className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm">
                <span className="font-medium text-[color:var(--foreground-strong)]">소요 시간(초, 선택)</span>
                <input
                  value={timeSpentSeconds}
                  onChange={(event) => setTimeSpentSeconds(event.target.value)}
                  inputMode="numeric"
                  className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2"
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium text-[color:var(--foreground-strong)]">확신도(선택)</span>
                <select
                  value={confidence}
                  onChange={(event) => setConfidence(event.target.value as ConfidenceLevel)}
                  className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2"
                >
                  {CONFIDENCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <Button type="button" className="w-full sm:w-auto" onClick={handleSetupNext}>
              다음: 답 입력
            </Button>
            <Link
              href={`/app/capture?mode=first&subject=${encodeURIComponent(subject)}`}
              className="block text-xs text-[color:var(--muted)] underline-offset-2 hover:underline"
            >
              오답 1개만 빠르게 기록할 수도 있습니다.
            </Link>
          </section>
        ) : null}

        {step === "answers" ? (
          <section className="space-y-4">
            <div className="space-y-2 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-3">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">답을 한 줄로 붙여넣어도 됩니다.</p>
              <p className="text-xs text-[color:var(--muted)]">공백, 쉼표, 줄바꿈을 구분자로 사용할 수 있습니다. 예: 1 3 2 4 5 / ①,③,②,④,⑤</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <textarea
                  value={bulkUserAnswers}
                  onChange={(event) => setBulkUserAnswers(event.target.value)}
                  placeholder="내 답: 1 3 2 4 5"
                  className="min-h-20 w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm"
                />
                <textarea
                  value={bulkCorrectAnswers}
                  onChange={(event) => setBulkCorrectAnswers(event.target.value)}
                  placeholder="정답: 1 4 2 4 3"
                  className="min-h-20 w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm"
                />
              </div>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleApplyBulkInput}>
                입력값 행에 반영
              </Button>
            </div>

            <p className="text-sm text-[color:var(--foreground-strong)]">입력이 맞는지 확인한 뒤 채점합니다.</p>
            <div className="space-y-3">
              {answerRows.map((row) => (
                <div key={row.questionNumber} className="space-y-2 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-3">
                  <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{row.questionNumber}번</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={row.userAnswer}
                      onChange={(event) => updateAnswerRow(row.questionNumber, "userAnswer", event.target.value)}
                      placeholder="내 답"
                      className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm"
                    />
                    <input
                      value={row.correctAnswer}
                      onChange={(event) => updateAnswerRow(row.questionNumber, "correctAnswer", event.target.value)}
                      placeholder="정답"
                      className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" className="w-full sm:w-auto" onClick={handleCheckAnswers}>
              채점하고 결과 보기
            </Button>
          </section>
        ) : null}

        {step === "result" ? (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-3 text-sm">총 {summary.total}문항</div>
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-3 text-sm">정답 {summary.correct}</div>
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-3 text-sm">오답 {summary.wrong}</div>
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-3 text-sm">정확도 {summary.accuracy}%</div>
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-3 text-sm">
                소요 시간 {timeSpentSeconds.trim() ? `${timeSpentSeconds}초` : "미입력"}
              </div>
            </div>
            <p className="text-sm text-[color:var(--foreground-strong)]">틀린 문항만 다시 봅니다.</p>
            <Button type="button" className="w-full sm:w-auto" onClick={handleResultNext}>
              {summary.wrong > 0 ? "다음: 오답 이유 입력" : "완료"}
            </Button>
          </section>
        ) : null}

        {step === "wrong-details" ? (
          <section className="space-y-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">해설 보기 전에, 이 선지가 틀린 이유를 한 문장으로 적어보세요.</p>
            <p className="text-xs text-[color:var(--muted)]">자주 나오는 실수: {subjectTemplate.commonErrorHints.join(" · ")}</p>
            <div className="space-y-4">
              {wrongDetails.map((row, index) => (
                <div
                  key={row.questionNumber}
                  data-testid={`first-set-wrong-detail-${index}`}
                  className="space-y-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-3"
                >
                  <p className="text-sm font-medium text-[color:var(--foreground-strong)]">
                    {row.questionNumber}번 · 내 답 {row.userAnswer} / 정답 {row.correctAnswer}
                  </p>
                  <div className="space-y-2">
                    {FIRST_STAGE_ERROR_REASON_OPTIONS.map((reason) => (
                      <button
                        key={`${row.questionNumber}-${reason}`}
                        type="button"
                        onClick={() => updateWrongDetail(row.questionNumber, "errorReason", reason)}
                        className={`w-full rounded-[var(--radius-md)] border px-3 py-2 text-left text-sm transition ${
                          row.errorReason === reason
                            ? "border-[color:var(--brand-700)] bg-[color:var(--brand-050)] text-[color:var(--foreground-strong)]"
                            : "border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] text-[color:var(--muted)]"
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={row.retrievalSentence}
                    onChange={(event) => updateWrongDetail(row.questionNumber, "retrievalSentence", event.target.value)}
                    placeholder={subjectTemplate.retrievalHint}
                    className="min-h-24 w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>

            <Button type="button" className="w-full sm:w-auto" disabled={submitting} onClick={() => void handleCreateWrongAnswers()}>
              {submitting ? "저장 중" : "재시도 큐 자동 생성"}
            </Button>
          </section>
        ) : null}

        {step === "done" ? (
          <section className="space-y-4" data-testid="first-set-solving-done">
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">오늘 작업은 여기까지입니다.</p>
              <ul className="mt-2 space-y-1 text-sm text-[color:var(--foreground-strong)]">
                <li>
                  오늘 한 일:{" "}
                  {summary.wrong > 0
                    ? `틀린 문항 ${createdCount}개를 재시도 큐에 넣었습니다.`
                    : "세트 풀이를 마치고 오답 없이 종료했습니다."}
                </li>
                <li>가장 큰 신호: {biggestSignal}</li>
                <li>다음 복습: {summary.wrong > 0 ? "재시도 큐에 자동 예약했습니다." : "다음 세트 풀이를 예약할 수 있습니다."}</li>
              </ul>
              <p className="mt-2 text-sm text-[color:var(--foreground-strong)]">지금은 종료해도 됩니다.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/app/review?mode=first" className="w-full sm:w-auto">
                <Button type="button" className="w-full sm:w-auto">
                  다시 볼 항목 확인
                </Button>
              </Link>
              <Link href="/app?mode=first" className="text-xs text-[color:var(--muted)] underline-offset-2 hover:underline">
                종료하고 오늘 화면으로
              </Link>
            </div>
          </section>
        ) : null}

        {errorMessage ? (
          <p data-testid="first-set-solving-error" className="text-xs text-[color:var(--danger)]">
            {errorMessage}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
