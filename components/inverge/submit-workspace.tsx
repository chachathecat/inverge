"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import { Check, Clock3, Save, Send } from "lucide-react";

import { FocusAudioControl } from "@/components/inverge/focus-audio-control";
import { OcrAssistPanel } from "@/components/inverge/ocr-assist-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSubjectDraft } from "@/hooks/use-subject-draft";
import { logInvergeEvent } from "@/lib/inverge/event-client";
import { getWorkContext } from "@/lib/inverge/mock-data";
import { cacheSecondExamSubmission, saveSecondExamSubmission } from "@/lib/inverge/second-exam-client";
import type { SubmissionMode } from "@/lib/inverge/types";

type WorkScreenProps = {
  examId?: string;
  sessionId?: string;
  subjectId?: string;
  mode?: SubmissionMode;
};

const SUBJECT_PROMPTS: Record<string, { title: string; body: string; minimumLength: number }> = {
  practice: {
    title: "실무 답안 작성",
    body: "문장 방식의 적용 여부와 계산 흐름이 먼저 보이도록 답안을 정리해 주세요.",
    minimumLength: 80,
  },
  theory: {
    title: "이론 답안 작성",
    body: "답안 요점을 먼저 드러내고 결론이 자연스럽게 닫히도록 정리해 주세요.",
    minimumLength: 160,
  },
  law: {
    title: "법규 답안 작성",
    body: "적용 조문, 검토 순서, 결론이 한 흐름으로 보이도록 답안을 정리해 주세요.",
    minimumLength: 160,
  },
};

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getSubmissionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `mock-${Date.now()}`;
}

function formatSavedAt(value: string) {
  if (!value) return "아직 저장 전";

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function SubmitWorkspace({ examId, sessionId, subjectId }: WorkScreenProps) {
  const router = useRouter();
  const { exam, session, subject } = getWorkContext({ examId, sessionId, subjectId });
  const prompt = SUBJECT_PROMPTS[subject.id] ?? SUBJECT_PROMPTS.practice;
  const draftKey = `${exam.id}:${session.id}:${subject.id}:write`;
  const { draft, saveDraft } = useSubjectDraft(draftKey);
  const [answer, setAnswer] = useState(draft.answer);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [savedAt, setSavedAt] = useState(draft.updatedAt);
  const [status, setStatus] = useState<"idle" | "saved" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(draft.uploadedFiles);
  const [ocrPreview, setOcrPreview] = useState(draft.ocrPreview);

  useEffect(() => {
    logInvergeEvent("second.write.started", {
      examId: exam.id,
      sessionId: session.id,
      subjectId: subject.id,
      stage: "second",
    });

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [exam.id, session.id, subject.id]);

  const derived = useMemo(() => {
    const trimmed = answer.trim();
    return {
      answerLength: trimmed.length,
      canSubmit: trimmed.length >= prompt.minimumLength && status !== "submitting",
      remainingLength: Math.max(prompt.minimumLength - trimmed.length, 0),
    };
  }, [answer, prompt.minimumLength, status]);

  function persistDraft(nextStatus: "idle" | "saved" | "submitting" = "saved") {
    const updatedAt = new Date().toISOString();
    saveDraft({
      answer,
      uploadedFiles,
      ocrPreview,
      submissionMode: "full-diagnostic",
      updatedAt,
    });
    setSavedAt(updatedAt);
    setStatus(nextStatus);
  }

  function handleSaveDraft() {
    persistDraft("saved");
    setErrorMessage("");
  }

  async function handleSubmit() {
    if (!derived.canSubmit) {
      setStatus("error");
      setErrorMessage(`답안을 조금 더 적어 주세요. 최소 ${prompt.minimumLength}자 기준입니다.`);
      return;
    }

    const submittedAt = new Date().toISOString();
    const submissionId = getSubmissionId();
    const submission = {
      submissionId,
      examId: exam.id,
      sessionId: session.id,
      subjectId: subject.id,
      promptId: `${subject.id}-sample-write`,
      promptTitle: prompt.title,
      answerText: answer,
      answerLength: derived.answerLength,
      elapsedSeconds,
      submittedAt,
    };

    persistDraft("submitting");
    try {
      const saved = await saveSecondExamSubmission(submission);
      cacheSecondExamSubmission(saved);
    } catch {
      cacheSecondExamSubmission(submission);
    }
    logInvergeEvent("second.write.submitted", {
      examId: exam.id,
      sessionId: session.id,
      subjectId: subject.id,
      submissionId,
      stage: "second",
      properties: {
        answerLength: derived.answerLength,
        elapsedSeconds,
      },
    });

    startTransition(() => {
      router.push(`/exams/${exam.id}/${session.id}/${subject.id}/compare/${submissionId}`);
    });
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1120px] flex-col px-5 py-8 sm:px-8 lg:py-10">
        <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-caption font-medium text-[color:var(--muted)]">
              {exam.shortName} · {session.label}
            </p>
            <h1 className="mt-2 text-h1 font-medium text-[color:var(--foreground-strong)]">{subject.name} 답안 작성</h1>
            <p className="mt-3 max-w-2xl text-body text-[color:var(--muted)]">
              비교는 제출 뒤에만 확인합니다. 지금은 답안 구조와 결론이 먼저 보이도록 차분하게 정리해 주세요.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <FocusAudioControl />
            <div className="flex items-center gap-3 text-sm text-[color:var(--muted)]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color:var(--surface)] px-3 py-1.5">
                <Clock3 className="h-4 w-4" />
                {formatElapsed(elapsedSeconds)}
              </span>
              <span className="hidden rounded-full border border-[var(--border)] bg-[color:var(--surface)] px-3 py-1.5 sm:inline-flex">
                {subject.expectedTime}
              </span>
            </div>
          </div>
        </header>

        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-5 lg:pt-2">
            <div>
              <p className="text-caption font-medium text-[color:var(--muted)]">이번 문제</p>
              <h2 className="mt-2 text-h2 font-medium leading-tight text-[color:var(--foreground-strong)]">{prompt.title}</h2>
              <p className="mt-4 text-sm leading-7 text-[color:var(--muted-strong)]">{prompt.body}</p>
            </div>

            <OcrAssistPanel
              title="답안 불러오기"
              description="필요할 때만 사진에서 초안을 가져온 뒤 검토해서 반영합니다."
              applyLabel="초안에 반영"
              directInputPlaceholder="답안 초안을 붙여 넣거나 사진에서 불러온 내용을 검토해 바로 고쳐 쓰세요."
              initialText={ocrPreview}
              helperText="사진으로 불러온 답안도 바로 확정하지 않고, 검토한 뒤 현재 초안에만 반영합니다."
              onApply={(text, fileNames) => {
                setAnswer(text);
                setUploadedFiles(fileNames);
                setOcrPreview(text);
                setStatus("idle");
                setErrorMessage("");
              }}
            />

            <div className="border-t border-[var(--border)] pt-5">
              <p className="text-caption text-[color:var(--muted)]">초안 상태</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-[color:var(--foreground-strong)]">
                {status === "saved" ? <Check className="h-4 w-4" /> : null}
                <span>{status === "submitting" ? "제출 중" : `최근 저장 ${formatSavedAt(savedAt)}`}</span>
              </div>
              <p className="mt-2 text-caption text-[color:var(--muted)]">
                {derived.answerLength.toLocaleString("ko-KR")}자 작성
                {derived.remainingLength > 0 ? ` · ${derived.remainingLength.toLocaleString("ko-KR")}자 더 필요` : ""}
              </p>
              {uploadedFiles.length > 0 ? (
                <p className="mt-2 text-caption text-[color:var(--muted)]">불러온 사진 {uploadedFiles.length}개</p>
              ) : null}
            </div>
          </aside>

          <section className="flex min-h-[62vh] flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow-focus)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{subject.focusAxis}</p>
            </div>
            <Textarea
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value);
                if (status !== "idle") setStatus("idle");
                if (errorMessage) setErrorMessage("");
              }}
              className="min-h-[58vh] flex-1 resize-none rounded-none border-0 bg-transparent px-5 py-5 text-[16px] leading-8 text-[color:var(--foreground-strong)] shadow-none outline-none placeholder:text-[color:var(--muted)] focus:border-transparent focus:ring-0 sm:px-6"
              placeholder={subject.inputPlaceholder}
            />
          </section>
        </section>

        {errorMessage ? (
          <p className="pb-3 text-sm text-[color:var(--status-red)]" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <footer className="sticky bottom-0 -mx-5 border-t border-[var(--border)] bg-[color:color-mix(in_srgb,var(--background)_92%,transparent)] px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
          <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={handleSaveDraft} disabled={status === "submitting"}>
              <Save className="mr-2 h-4 w-4" />
              초안 저장
            </Button>
            <Button type="button" size="lg" onClick={() => void handleSubmit()} disabled={status === "submitting"}>
              <Send className="mr-2 h-4 w-4" />
              {status === "submitting" ? "제출 중" : "답안 제출"}
            </Button>
          </div>
        </footer>
      </div>
    </main>
  );
}
