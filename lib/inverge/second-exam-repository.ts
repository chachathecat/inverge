import "server-only";

import { createJsonFileRepository } from "@/lib/inverge/file-persistence";
import type {
  SecondExamRewriteRecord,
  SecondExamSourceEntry,
  SecondExamSubmissionRecord,
} from "@/lib/inverge/second-exam-types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canUseSupabasePersistence } from "@/lib/supabase/persistence";

type SecondExamStore = {
  submissions: SecondExamSubmissionRecord[];
  rewrites: SecondExamRewriteRecord[];
};

const store = createJsonFileRepository<SecondExamStore>("second-exam.json", () => ({
  submissions: [],
  rewrites: [],
}));

function sortBySubmittedAtDesc<T extends { submittedAt: string }>(items: T[]) {
  return [...items].sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
}

function matchesContext<T extends { examId: string; sessionId: string; subjectId: string }>(
  item: T,
  context: { examId: string; sessionId: string; subjectId: string },
) {
  return item.examId === context.examId && item.sessionId === context.sessionId && item.subjectId === context.subjectId;
}

function toSubmissionEntry(item: SecondExamSubmissionRecord): SecondExamSourceEntry {
  return {
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
  };
}

function toRewriteEntry(item: SecondExamRewriteRecord): SecondExamSourceEntry {
  return {
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
  };
}

class FileSecondExamRepository {
  saveSubmission(input: SecondExamSubmissionRecord) {
    return store.update((data) => {
      const nextSubmissions = [input, ...data.submissions.filter((item) => item.submissionId !== input.submissionId)];
      return { next: { ...data, submissions: nextSubmissions }, result: input };
    });
  }

  saveRewrite(input: SecondExamRewriteRecord) {
    return store.update((data) => {
      const nextRewrites = [input, ...data.rewrites.filter((item) => item.rewriteId !== input.rewriteId)];
      return { next: { ...data, rewrites: nextRewrites }, result: input };
    });
  }

  getSubmission(submissionId: string) {
    return store.read().submissions.find((item) => item.submissionId === submissionId) ?? null;
  }

  getRewrite(rewriteId: string) {
    return store.read().rewrites.find((item) => item.rewriteId === rewriteId) ?? null;
  }

  getLatestSubmission(context: { examId: string; sessionId: string; subjectId: string }) {
    return sortBySubmittedAtDesc(store.read().submissions.filter((item) => matchesContext(item, context)))[0] ?? null;
  }

  getLatestRewrite(context: { examId: string; sessionId: string; subjectId: string }) {
    return sortBySubmittedAtDesc(store.read().rewrites.filter((item) => matchesContext(item, context)))[0] ?? null;
  }

  getSourceEntry(entryId: string, context: { examId: string; sessionId: string; subjectId: string }) {
    if (entryId !== "latest") {
      const submission = this.getSubmission(entryId);
      if (submission) return toSubmissionEntry(submission);
      const rewrite = this.getRewrite(entryId);
      if (rewrite) return toRewriteEntry(rewrite);
      return null;
    }

    const candidates = [
      this.getLatestSubmission(context) ? toSubmissionEntry(this.getLatestSubmission(context)!) : null,
      this.getLatestRewrite(context) ? toRewriteEntry(this.getLatestRewrite(context)!) : null,
    ].filter((item): item is SecondExamSourceEntry => Boolean(item));
    return sortBySubmittedAtDesc(candidates)[0] ?? null;
  }

  listHistory(context: { examId: string; sessionId: string; subjectId: string }) {
    const data = store.read();
    return {
      submissions: sortBySubmittedAtDesc(data.submissions.filter((item) => matchesContext(item, context))),
      rewrites: sortBySubmittedAtDesc(data.rewrites.filter((item) => matchesContext(item, context))),
    };
  }
}

class SupabaseSecondExamRepository {
  private readonly fileFallback = new FileSecondExamRepository();

  private get client() {
    return createSupabaseAdminClient();
  }

  saveSubmission(userId: string, input: SecondExamSubmissionRecord) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return this.fileFallback.saveSubmission(input);
    return client
      .from("answer_submissions")
      .insert({
        id: input.submissionId,
        user_id: userId,
        exam_id: input.examId,
        subject_id: input.subjectId,
        stage: "second",
        session_id: input.sessionId,
        submission_kind: "write_submission",
        source_label: input.promptId ?? input.promptTitle ?? input.subjectId,
        raw_payload: input,
        derived_payload: { answerLength: input.answerLength, elapsedSeconds: input.elapsedSeconds },
        created_at: input.submittedAt,
        updated_at: input.submittedAt,
      })
      .then(() => input);
  }

  saveRewrite(userId: string, input: SecondExamRewriteRecord) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return this.fileFallback.saveRewrite(input);
    return client
      .from("rewrite_submissions")
      .insert({
        id: input.rewriteId,
        user_id: userId,
        exam_id: input.examId,
        subject_id: input.subjectId,
        stage: "second",
        source_submission_id: input.sourceSubmissionId,
        rewrite_kind: "rewrite_submission",
        raw_payload: input,
        derived_payload: { focusLabel: input.focusLabel, gapTitle: input.gapTitle },
        created_at: input.submittedAt,
        updated_at: input.submittedAt,
      })
      .then(() => input);
  }

  async getSubmission(userId: string, submissionId: string) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return this.fileFallback.getSubmission(submissionId);
    const { data } = await client
      .from("answer_submissions")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("id", submissionId)
      .maybeSingle();
    return (data?.raw_payload as SecondExamSubmissionRecord | undefined) ?? null;
  }

  async getRewrite(userId: string, rewriteId: string) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return this.fileFallback.getRewrite(rewriteId);
    const { data } = await client
      .from("rewrite_submissions")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("id", rewriteId)
      .maybeSingle();
    return (data?.raw_payload as SecondExamRewriteRecord | undefined) ?? null;
  }

  async getLatestSubmission(userId: string, context: { examId: string; sessionId: string; subjectId: string }) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return this.fileFallback.getLatestSubmission(context);
    const { data } = await client
      .from("answer_submissions")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", context.examId)
      .eq("subject_id", context.subjectId)
      .eq("stage", "second")
      .eq("session_id", context.sessionId)
      .eq("submission_kind", "write_submission")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.raw_payload as SecondExamSubmissionRecord | undefined) ?? null;
  }

  async getLatestRewrite(userId: string, context: { examId: string; sessionId: string; subjectId: string }) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return this.fileFallback.getLatestRewrite(context);
    const { data } = await client
      .from("rewrite_submissions")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", context.examId)
      .eq("subject_id", context.subjectId)
      .eq("stage", "second")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.raw_payload as SecondExamRewriteRecord | undefined) ?? null;
  }

  async getSourceEntry(userId: string, entryId: string, context: { examId: string; sessionId: string; subjectId: string }) {
    if (entryId !== "latest") {
      const submission = await this.getSubmission(userId, entryId);
      if (submission) return toSubmissionEntry(submission);
      const rewrite = await this.getRewrite(userId, entryId);
      if (rewrite) return toRewriteEntry(rewrite);
      return null;
    }
    const candidates = [
      (await this.getLatestSubmission(userId, context)) ? toSubmissionEntry((await this.getLatestSubmission(userId, context))!) : null,
      (await this.getLatestRewrite(userId, context)) ? toRewriteEntry((await this.getLatestRewrite(userId, context))!) : null,
    ].filter((item): item is SecondExamSourceEntry => Boolean(item));
    return sortBySubmittedAtDesc(candidates)[0] ?? null;
  }

  async listHistory(userId: string, context: { examId: string; sessionId: string; subjectId: string }) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return this.fileFallback.listHistory(context);
    const { data: submissionRows } = await client
      .from("answer_submissions")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", context.examId)
      .eq("subject_id", context.subjectId)
      .eq("stage", "second")
      .eq("session_id", context.sessionId)
      .eq("submission_kind", "write_submission")
      .order("created_at", { ascending: false });
    const { data: rewriteRows } = await client
      .from("rewrite_submissions")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", context.examId)
      .eq("subject_id", context.subjectId)
      .eq("stage", "second")
      .order("created_at", { ascending: false });
    return {
      submissions: (submissionRows ?? []).map((row) => row.raw_payload as SecondExamSubmissionRecord),
      rewrites: (rewriteRows ?? []).map((row) => row.raw_payload as SecondExamRewriteRecord),
    };
  }
}

const fileRepository = new FileSecondExamRepository();
const supabaseRepository = new SupabaseSecondExamRepository();

export const secondExamRepository = {
  saveSubmission(userId: string, input: SecondExamSubmissionRecord) {
    return canUseSupabasePersistence(userId) ? supabaseRepository.saveSubmission(userId, input) : fileRepository.saveSubmission(input);
  },
  saveRewrite(userId: string, input: SecondExamRewriteRecord) {
    return canUseSupabasePersistence(userId) ? supabaseRepository.saveRewrite(userId, input) : fileRepository.saveRewrite(input);
  },
  getSubmission(userId: string, submissionId: string) {
    return canUseSupabasePersistence(userId) ? supabaseRepository.getSubmission(userId, submissionId) : fileRepository.getSubmission(submissionId);
  },
  getRewrite(userId: string, rewriteId: string) {
    return canUseSupabasePersistence(userId) ? supabaseRepository.getRewrite(userId, rewriteId) : fileRepository.getRewrite(rewriteId);
  },
  getLatestSubmission(userId: string, context: { examId: string; sessionId: string; subjectId: string }) {
    return canUseSupabasePersistence(userId) ? supabaseRepository.getLatestSubmission(userId, context) : fileRepository.getLatestSubmission(context);
  },
  getLatestRewrite(userId: string, context: { examId: string; sessionId: string; subjectId: string }) {
    return canUseSupabasePersistence(userId) ? supabaseRepository.getLatestRewrite(userId, context) : fileRepository.getLatestRewrite(context);
  },
  getSourceEntry(userId: string, entryId: string, context: { examId: string; sessionId: string; subjectId: string }) {
    return canUseSupabasePersistence(userId) ? supabaseRepository.getSourceEntry(userId, entryId, context) : fileRepository.getSourceEntry(entryId, context);
  },
  listHistory(userId: string, context: { examId: string; sessionId: string; subjectId: string }) {
    return canUseSupabasePersistence(userId) ? supabaseRepository.listHistory(userId, context) : fileRepository.listHistory(context);
  },
};
