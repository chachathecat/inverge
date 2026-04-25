"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APPRAISAL_FIRST_SUBJECTS,
  CONFIDENCE_OPTIONS,
  FIRST_STAGE_ERROR_REASON_OPTIONS,
  type ConfidenceLevel,
  type WrongAnswerItemInput,
} from "@/lib/review-os/types";

type Step = "setup" | "answers" | "result" | "wrong-details" | "done";

type AnswerRow = {
  questionNumber: number;
  userAnswer: string;
  correctAnswer: string;
};

type WrongDetailRow = {
  questionNumber: number;
  userAnswer: string;
  correctAnswer: string;
  errorReason: string;
  retrievalSentence: string;
};

function normalizeAnswer(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getIsCorrect(userAnswer: string, correctAnswer: string) {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  return normalizedUser.length > 0 && normalizedCorrect.length > 0 && normalizedUser === normalizedCorrect;
}

export function FirstSetSolvingForm() {
  const [step, setStep] = useState<Step>("setup");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [subject, setSubject] = useState<(typeof APPRAISAL_FIRST_SUBJECTS)[number]>(APPRAISAL_FIRST_SUBJECTS[0]);
  const [setTitle, setSetTitle] = useState("");
  const [questionCount, setQuestionCount] = useState("5");
  const [timeSpentSeconds, setTimeSpentSeconds] = useState("");
  const [confidence, setConfidence] = useState<ConfidenceLevel>("중간");

  const [answerRows, setAnswerRows] = useState<AnswerRow[]>([]);
  const [wrongDetails, setWrongDetails] = useState<WrongDetailRow[]>([]);
  const [createdCount, setCreatedCount] = useState(0);

  const summary = useMemo(() => {
    const total = answerRows.length;
    const correct = answerRows.filter((row) => getIsCorrect(row.userAnswer, row.correctAnswer)).length;
    const wrong = total - correct;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, correct, wrong, accuracy };
  }, [answerRows]);

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

  function handleCheckAnswers() {
    if (answerRows.some((row) => !normalizeAnswer(row.userAnswer) || !normalizeAnswer(row.correctAnswer))) {
      setErrorMessage("모든 문항에 내 답과 정답을 입력해 주세요.");
      return;
    }

    const wrongRows = answerRows
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
    if (wrongDetails.some((row) => !row.errorReason)) {
      setErrorMessage("틀린 문항마다 오답 이유를 선택해 주세요.");
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
            <Link href="/app/capture?mode=first" className="block text-xs text-[color:var(--muted)] underline-offset-2 hover:underline">
              오답 1개만 빠르게 기록할 수도 있습니다.
            </Link>
          </section>
        ) : null}

        {step === "answers" ? (
          <section className="space-y-4">
            <p className="text-sm text-[color:var(--foreground-strong)]">문항별 내 답과 정답을 입력합니다.</p>
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
            <div className="space-y-4">
              {wrongDetails.map((row) => (
                <div key={row.questionNumber} className="space-y-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-3">
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
                    placeholder="해설 전에 떠오른 이유를 한 문장으로 적습니다."
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
          <section className="space-y-4">
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">재시도 큐에 자동으로 넣었습니다.</p>
              <p className="mt-2 text-sm text-[color:var(--foreground-strong)]">
                {summary.wrong > 0 ? `틀린 문항 ${createdCount}개를 오답 기록으로 생성했습니다.` : "이번 세트는 전부 정답입니다."}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/app/review?mode=first" className="w-full sm:w-auto">
                <Button type="button" className="w-full sm:w-auto">
                  다시 볼 항목 확인
                </Button>
              </Link>
              <Link href="/app/capture?mode=first" className="text-xs text-[color:var(--muted)] underline-offset-2 hover:underline">
                오답 1개만 빠르게 기록
              </Link>
            </div>
          </section>
        ) : null}

        {errorMessage ? <p className="text-xs text-[color:var(--danger)]">{errorMessage}</p> : null}
      </CardContent>
    </Card>
  );
}
