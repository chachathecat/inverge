"use client";

import type {
  SecondExamRewriteRecord,
  SecondExamSourceEntry,
  SecondExamSubmissionRecord,
} from "@/lib/inverge/second-exam-types";

type HistoryResponse = {
  submissions: SecondExamSubmissionRecord[];
  rewrites: SecondExamRewriteRecord[];
};

function readJson<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function readLocalSecondExamSource(
  entryId: string,
  context: { examId: string; sessionId: string; subjectId: string },
): SecondExamSourceEntry | null {
  if (typeof window === "undefined") return null;

  const entries: SecondExamSourceEntry[] = [];
  const directSubmission = readJson<SecondExamSubmissionRecord>(
    window.localStorage.getItem(`inverge:second-exam:submission:${entryId}`),
  );
  if (directSubmission) {
    return {
      entryId: directSubmission.submissionId,
      sourceType: "submission",
      examId: directSubmission.examId,
      sessionId: directSubmission.sessionId,
      subjectId: directSubmission.subjectId,
      answerText: directSubmission.answerText,
      answerLength: directSubmission.answerLength,
      elapsedSeconds: directSubmission.elapsedSeconds,
      promptTitle: directSubmission.promptTitle,
      submittedAt: directSubmission.submittedAt,
    };
  }

  const directRewrite = readJson<SecondExamRewriteRecord>(
    window.localStorage.getItem(`inverge:second-exam:rewrite:${entryId}`),
  );
  if (directRewrite) {
    return {
      entryId: directRewrite.rewriteId,
      sourceType: "rewrite",
      examId: directRewrite.examId,
      sessionId: directRewrite.sessionId,
      subjectId: directRewrite.subjectId,
      answerText: directRewrite.rewrittenAnswerText,
      answerLength: directRewrite.rewrittenAnswerLength,
      focusLabel: directRewrite.focusLabel,
      gapTitle: directRewrite.gapTitle,
      sourceSubmissionId: directRewrite.sourceSubmissionId,
      submittedAt: directRewrite.submittedAt,
    };
  }

  if (entryId !== "latest") return null;

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;

    if (key.startsWith("inverge:second-exam:submission:")) {
      const item = readJson<SecondExamSubmissionRecord>(window.localStorage.getItem(key));
      if (item && item.examId === context.examId && item.sessionId === context.sessionId && item.subjectId === context.subjectId) {
        entries.push({
          entryId: item.submissionId,
          sourceType: "submission",
          examId: item.examId,
          sessionId: item.sessionId,
          subjectId: item.subjectId,
          answerText: item.answerText,
          answerLength: item.answerLength,
          elapsedSeconds: item.elapsedSeconds,
          promptTitle: item.promptTitle,
          submittedAt: item.submittedAt,
        });
      }
    }

    if (key.startsWith("inverge:second-exam:rewrite:")) {
      const item = readJson<SecondExamRewriteRecord>(window.localStorage.getItem(key));
      if (item && item.examId === context.examId && item.sessionId === context.sessionId && item.subjectId === context.subjectId) {
        entries.push({
          entryId: item.rewriteId,
          sourceType: "rewrite",
          examId: item.examId,
          sessionId: item.sessionId,
          subjectId: item.subjectId,
          answerText: item.rewrittenAnswerText,
          answerLength: item.rewrittenAnswerLength,
          focusLabel: item.focusLabel,
          gapTitle: item.gapTitle,
          sourceSubmissionId: item.sourceSubmissionId,
          submittedAt: item.submittedAt,
        });
      }
    }
  }

  return entries.sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))[0] ?? null;
}

export function readLocalSecondExamHistory(context: {
  examId: string;
  sessionId: string;
  subjectId: string;
}): HistoryResponse {
  if (typeof window === "undefined") {
    return { submissions: [], rewrites: [] };
  }

  const submissions: SecondExamSubmissionRecord[] = [];
  const rewrites: SecondExamRewriteRecord[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;

    if (key.startsWith("inverge:second-exam:submission:")) {
      const item = readJson<SecondExamSubmissionRecord>(window.localStorage.getItem(key));
      if (item && item.examId === context.examId && item.sessionId === context.sessionId && item.subjectId === context.subjectId) {
        submissions.push(item);
      }
    }

    if (key.startsWith("inverge:second-exam:rewrite:")) {
      const item = readJson<SecondExamRewriteRecord>(window.localStorage.getItem(key));
      if (item && item.examId === context.examId && item.sessionId === context.sessionId && item.subjectId === context.subjectId) {
        rewrites.push(item);
      }
    }
  }

  return {
    submissions: submissions.sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)),
    rewrites: rewrites.sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)),
  };
}

export async function fetchSecondExamSource(
  entryId: string,
  context: { examId: string; sessionId: string; subjectId: string },
) {
  const params = new URLSearchParams({
    entryId,
    examId: context.examId,
    sessionId: context.sessionId,
    subjectId: context.subjectId,
  });
  const response = await fetch(`/api/inverge/second-exam/source?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("second-exam-source-fetch-failed");

  const result = (await response.json()) as { ok?: boolean; data?: SecondExamSourceEntry };
  if (!result.ok || !result.data) throw new Error("second-exam-source-invalid-response");
  return result.data;
}

export async function fetchSecondExamHistory(context: {
  examId: string;
  sessionId: string;
  subjectId: string;
}) {
  const params = new URLSearchParams(context);
  const response = await fetch(`/api/inverge/second-exam/history?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("second-exam-history-fetch-failed");

  const result = (await response.json()) as { ok?: boolean; data?: HistoryResponse };
  if (!result.ok || !result.data) throw new Error("second-exam-history-invalid-response");
  return result.data;
}

export async function saveSecondExamSubmission(input: SecondExamSubmissionRecord) {
  const response = await fetch("/api/inverge/second-exam/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("second-exam-submission-save-failed");

  const result = (await response.json()) as { ok?: boolean; data?: SecondExamSubmissionRecord };
  if (!result.ok || !result.data) throw new Error("second-exam-submission-save-invalid");
  return result.data;
}

export async function saveSecondExamRewrite(input: SecondExamRewriteRecord) {
  const response = await fetch("/api/inverge/second-exam/rewrites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("second-exam-rewrite-save-failed");

  const result = (await response.json()) as { ok?: boolean; data?: SecondExamRewriteRecord };
  if (!result.ok || !result.data) throw new Error("second-exam-rewrite-save-invalid");
  return result.data;
}

export function cacheSecondExamSubmission(input: SecondExamSubmissionRecord) {
  try {
    window.localStorage.setItem(`inverge:second-exam:submission:${input.submissionId}`, JSON.stringify(input));
  } catch {
    // Keep cache failures silent.
  }
}

export function cacheSecondExamRewrite(input: SecondExamRewriteRecord) {
  try {
    window.localStorage.setItem(`inverge:second-exam:rewrite:${input.rewriteId}`, JSON.stringify(input));
  } catch {
    // Keep cache failures silent.
  }
}

export function subscribeSecondExamStorage(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
