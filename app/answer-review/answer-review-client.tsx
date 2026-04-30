"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  normalizeAnswerReviewStructureDraft,
  type AnswerReviewStructureDraft,
} from "@/lib/evaluate/answer-review-structure";
import { getDefaultSubject, normalizeSubjectForMode, parseAppraisalMode, type AppraisalMode } from "@/lib/review-os/appraisal";
import { APPRAISAL_FIRST_SUBJECTS, APPRAISAL_SECOND_SUBJECTS } from "@/lib/review-os/types";
import { cn } from "@/lib/utils";

type InputStatusCardProps = {
  title: string;
  statusText: string;
  helper: string;
};

type StepId = 1 | 2 | 3;

const SECTION_FADE = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const CARD_TEXT_MAX_LENGTH = 200;
const DETAILS_TEXT_MAX_LENGTH = 560;
const FILE_NAME_MAX_LENGTH = 34;

const STEP_ITEMS: Array<{ id: StepId; label: string }> = [
  { id: 1, label: "자료 입력" },
  { id: 2, label: "검토 결과 확인" },
  { id: 3, label: "피드백 초안 정리" },
];

function InputStatusCard({ title, statusText, helper }: InputStatusCardProps) {
  return (
    <motion.article
      layout
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] p-3"
    >
      <p className="text-caption font-medium text-[color:var(--muted)]">{title}</p>
      <p className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">{statusText}</p>
      <p className="mt-1 text-caption leading-5 text-[color:var(--muted)]">{helper}</p>
    </motion.article>
  );
}

export default function AnswerReviewClientPage() {
  const getInitialReviewContext = () => {
    if (typeof window === "undefined") {
      return { examMode: "first" as AppraisalMode, subject: getDefaultSubject("first") };
    }
    const params = new URLSearchParams(window.location.search);
    const parsedMode = parseAppraisalMode(params.get("mode")) ?? "first";
    return {
      examMode: parsedMode,
      subject: normalizeSubjectForMode(params.get("subject"), parsedMode),
    };
  };

  const initialReviewContext = getInitialReviewContext();
  const [problemFiles, setProblemFiles] = useState<File[]>([]);
  const [myAnswerFiles, setMyAnswerFiles] = useState<File[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [problemText, setProblemText] = useState("");
  const [myAnswerText, setMyAnswerText] = useState("");
  const [referenceAnswerText, setReferenceAnswerText] = useState("");
  const [missingPointMemo, setMissingPointMemo] = useState("");
  const [revisionParagraph, setRevisionParagraph] = useState("");
  const [feedbackCopyStatus, setFeedbackCopyStatus] = useState<"idle" | "success" | "failed">("idle");
  const [copiedFeedbackDraftText, setCopiedFeedbackDraftText] = useState<string | null>(null);
  const [isStructuring, setIsStructuring] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [structureDraft, setStructureDraft] = useState<AnswerReviewStructureDraft | null>(null);
  const [learningSignalStatus, setLearningSignalStatus] = useState<"saved" | "skipped" | "failed" | null>(null);
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [examMode, setExamMode] = useState<AppraisalMode>(initialReviewContext.examMode);
  const [subject, setSubject] = useState<string>(initialReviewContext.subject);

  const shouldReduceMotion = useReducedMotion();
  const subjectOptions = examMode === "second" ? APPRAISAL_SECOND_SUBJECTS : APPRAISAL_FIRST_SUBJECTS;

  const handleProblemFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProblemFiles(Array.from(event.target.files ?? []));
  };

  const handleMyAnswerFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMyAnswerFiles(Array.from(event.target.files ?? []));
  };

  const handleReferenceFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setReferenceFiles(Array.from(event.target.files ?? []));
  };

  const hasProblemInput = problemText.trim().length > 0 || problemFiles.length > 0;
  const hasMyAnswer = myAnswerText.trim().length > 0 || myAnswerFiles.length > 0;
  const hasReferenceAnswer = referenceAnswerText.trim().length > 0 || referenceFiles.length > 0;
  const hasMissingPointMemo = missingPointMemo.trim().length > 0;
  const hasRevisionParagraph = revisionParagraph.trim().length > 0;

  const getParagraphCount = (text: string) => {
    const normalized = text.trim();
    if (!normalized) return 0;
    return normalized
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean).length;
  };

  const toShortLine = (text: string, fallback: string, maxLength = CARD_TEXT_MAX_LENGTH) => {
    const normalized = text.trim().replace(/\s+/g, " ");
    if (!normalized) return fallback;
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength).trimEnd()}…`;
  };

  const toDetailLine = (text: string, fallback: string, maxLength = DETAILS_TEXT_MAX_LENGTH) => {
    const normalized = text.trim().replace(/\s+/g, " ");
    if (!normalized) return fallback;
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength).trimEnd()}…`;
  };

  const shortenFileName = (name: string, maxLength = FILE_NAME_MAX_LENGTH) => {
    if (name.length <= maxLength) return name;
    const extIndex = name.lastIndexOf(".");
    if (extIndex <= 0 || extIndex >= name.length - 1) return `${name.slice(0, maxLength - 1).trimEnd()}…`;
    const ext = name.slice(extIndex);
    const base = name.slice(0, extIndex);
    const baseMaxLength = Math.max(8, maxLength - ext.length - 1);
    return `${base.slice(0, baseMaxLength).trimEnd()}…${ext}`;
  };

  const summarizeFiles = (files: File[]) => {
    if (files.length === 0) return "선택된 파일이 없습니다.";
    if (files.length <= 2) return files.map((file) => shortenFileName(file.name)).join(", ");
    return `${shortenFileName(files[0].name)}, ${shortenFileName(files[1].name)} 외 ${files.length - 2}개`;
  };

  const firstBigGap = useMemo(() => {
    if (!structureDraft) return "";
    const missingCandidate = structureDraft.missingIssueCandidates.find((candidate) => candidate.trim().length > 0);
    if (missingCandidate) return missingCandidate;
    if (structureDraft.weakLogicPoint.trim().length > 0) return structureDraft.weakLogicPoint;
    if (structureDraft.weakParagraphPoint.trim().length > 0) return structureDraft.weakParagraphPoint;
    return "";
  }, [structureDraft]);

  const runStructure = async () => {
    if (!hasMyAnswer) {
      setStructureError("내 답안 파일 또는 텍스트를 먼저 입력해 주세요.");
      return;
    }

    setIsStructuring(true);
    setStructureError(null);

    try {
      const formData = new FormData();
      for (const file of problemFiles) formData.append("questionFiles", file);
      for (const file of myAnswerFiles) formData.append("answerFiles", file);
      for (const file of referenceFiles) formData.append("referenceFiles", file);
      formData.set("questionText", problemText);
      formData.set("answerText", myAnswerText);
      formData.set("referenceText", referenceAnswerText);
      formData.set("examMode", examMode);
      formData.set("subject", normalizeSubjectForMode(subject, examMode));

      const response = await fetch("/api/answer-review/structure", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | { ok: true; draft: unknown; learningSignalStatus?: "saved" | "skipped" | "failed" }
        | { ok: false; error: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "검토 결과를 불러오지 못했습니다." : payload.error);
      }

      const normalizedDraft = normalizeAnswerReviewStructureDraft(payload.draft);
      setStructureDraft(normalizedDraft);
      setLearningSignalStatus(payload.learningSignalStatus ?? "skipped");
      setMissingPointMemo(normalizedDraft.missingIssueCandidates.join(", "));
      setRevisionParagraph(normalizedDraft.rewriteDraftSuggestion);
      setCurrentStep(2);
    } catch (error) {
      setStructureDraft(null);
      setLearningSignalStatus(null);
      setStructureError(
        error instanceof Error
          ? error.message
          : "지금은 파일 검토를 진행할 수 없습니다. 텍스트 입력으로 계속해 주세요.",
      );
      setCurrentStep(2);
    } finally {
      setIsStructuring(false);
    }
  };

  const feedbackDraftText = useMemo(() => {
    const inputStatusSummary = `문제/사례 ${hasProblemInput ? "입력됨" : "미입력"}, 내 답안 ${hasMyAnswer ? "입력됨" : "미입력"}, 기준답안 ${
      hasReferenceAnswer ? "입력됨" : "미입력"
    }`;
    const missingPointSummary = hasMissingPointMemo
      ? `이번 답안은 ${missingPointMemo.trim()} 보강이 우선입니다.`
      : "누락 논점 후보를 먼저 적으면 피드백 초안이 완성됩니다.";
    const revisionSummary = hasRevisionParagraph
      ? revisionParagraph.trim()
      : "교정 문단을 작성하면 학생에게 줄 다음 행동이 더 선명해집니다.";

    return [
      "[입력 상태]",
      `- ${inputStatusSummary}`,
      "",
      "[가장 큰 간극]",
      `- ${missingPointSummary}`,
      "",
      "[다시 쓸 문장]",
      `- ${revisionSummary}`,
      "",
      "[다음 행동]",
      "- 교정 문단 구조를 기준으로 한 문단만 다시 작성해 보세요.",
      "",
      "※ 검토자 확인 전 전달하지 않는 피드백 초안입니다.",
    ].join("\n");
  }, [hasMissingPointMemo, hasMyAnswer, hasProblemInput, hasReferenceAnswer, hasRevisionParagraph, missingPointMemo, revisionParagraph]);

  useEffect(() => {
    setFeedbackCopyStatus("idle");
    setCopiedFeedbackDraftText(null);
  }, [feedbackDraftText]);

  const handleExamModeChange = (nextMode: AppraisalMode) => {
    setExamMode(nextMode);
    setSubject((prev) => normalizeSubjectForMode(prev, nextMode));
  };

  const reviewerNoteText = useMemo(() => {
    return [
      "입력 상태",
      `- 문제/사례: ${hasProblemInput ? "입력됨" : "미입력"}`,
      `- 내 답안: ${hasMyAnswer ? "입력됨" : "미입력"}`,
      `- 기준답안: ${hasReferenceAnswer ? "입력됨" : "미입력"}`,
      "",
      "누락 후보",
      `- ${hasMissingPointMemo ? missingPointMemo.trim() : "누락 논점 후보 메모 필요"}`,
      "",
      "교정 문단",
      `- ${hasRevisionParagraph ? revisionParagraph.trim() : "교정 문단 작성 필요"}`,
      "",
      "확인 필요",
      "- 현재 화면에서만 확인하는 초안입니다.",
    ].join("\n");
  }, [hasMissingPointMemo, hasMyAnswer, hasProblemInput, hasReferenceAnswer, hasRevisionParagraph, missingPointMemo, revisionParagraph]);

  const copyFeedbackDraft = async () => {
    try {
      await navigator.clipboard.writeText(feedbackDraftText);
      setCopiedFeedbackDraftText(feedbackDraftText);
      setFeedbackCopyStatus("success");
    } catch {
      setCopiedFeedbackDraftText(null);
      setFeedbackCopyStatus("failed");
    }
  };

  const didCopyCurrentDraft = feedbackCopyStatus === "success" && copiedFeedbackDraftText === feedbackDraftText;
  const primaryActionLabel =
    currentStep === 1
      ? isStructuring
        ? "답안 검토 중..."
        : "답안 검토 시작"
      : currentStep === 2
        ? "피드백 초안 만들기"
        : "피드백 초안 복사";
  const isPrimaryActionDisabled = currentStep === 1 ? !hasMyAnswer || isStructuring : false;
  const completionStatus = structureError
    ? "검토 오류"
    : isStructuring
      ? "검토 중"
      : structureDraft
        ? "검토 완료"
        : "검토 대기";

  const biggestGapFix = toShortLine(structureDraft?.rewriteTarget || structureDraft?.nextAction || "", "누락된 핵심 논점을 문단 하나로 다시 구성해 보세요.");

  const handlePrimaryAction = () => {
    if (currentStep === 1) {
      void runStructure();
      return;
    }
    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }
    void copyFeedbackDraft();
  };

  return (
    <RefinedShell className="space-y-5 py-6 sm:space-y-8 sm:py-10">
      <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <RefinedBadge>검토 보조 초안 베타</RefinedBadge>
          <RefinedBadge tone="amber">최종 판단은 검토자 확인이 필요합니다</RefinedBadge>
        </div>
        <p className="text-caption leading-5 text-[color:var(--muted)]">
          의미 있는 입력만 학습 기록에 반영되며, 원문 답안은 기록 요약에 직접 저장하지 않습니다.
        </p>

        <section className="space-y-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4 sm:p-5">
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] p-3">
            <ol className="grid gap-2 sm:grid-cols-3">
              {STEP_ITEMS.map((item) => {
                const isActive = currentStep === item.id;
                const isDone = currentStep > item.id;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "rounded-[var(--radius-sm)] border px-3 py-2 text-caption leading-5",
                      isActive
                        ? "border-[#1E2A46] text-[#1E2A46]"
                        : "border-[var(--border)] text-[color:var(--muted)]",
                    )}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <span className={cn("mr-1", isDone ? "text-[#1E2A46]" : "text-[color:var(--muted)]")}>{item.id}.</span>
                    {item.label}
                  </li>
                );
              })}
            </ol>
          </div>

          {currentStep !== 1 ? (
            <button
              type="button"
              className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-auto")}
              onClick={handlePrimaryAction}
              disabled={isPrimaryActionDisabled}
            >
              {primaryActionLabel}
            </button>
          ) : null}

          {currentStep === 1 ? (
            <motion.section
              className="space-y-4"
              initial={shouldReduceMotion ? false : "hidden"}
              animate={shouldReduceMotion ? undefined : "visible"}
              variants={SECTION_FADE}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <motion.div
                  className="space-y-4"
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, ease: "easeOut" }}
                >
                  <article className="rounded-[var(--radius-md)] border border-[#27375f] bg-[linear-gradient(160deg,#f8f7f3_0%,#f3f1eb_100%)] p-4 sm:p-5">
                    <p className="text-caption font-medium text-[#3f4c66]">입력 스튜디오 · 빠른 시작</p>
                    <p className="mt-2 text-sm font-semibold text-[#1e2a46]">내 답안만 있어도 검토를 시작할 수 있습니다.</p>
                    <p className="mt-1 text-caption leading-5 text-[#3f4c66]">문제와 기준답안을 추가하면 간극이 더 정확해집니다.</p>
                  </article>
                  <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-caption font-medium text-[color:var(--muted)]">
                  시험 모드
                  <select
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--foreground-strong)]"
                    value={examMode}
                    onChange={(event) => handleExamModeChange(event.target.value === "second" ? "second" : "first")}
                  >
                    <option value="first">감정평가사 1차</option>
                    <option value="second">감정평가사 2차</option>
                  </select>
                </label>
                <label className="space-y-2 text-caption font-medium text-[color:var(--muted)]">
                  과목
                  <select
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--foreground-strong)]"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                  >
                    {subjectOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                  </div>
                  <article className="space-y-2 rounded-[var(--radius-md)] border border-[#27375f] bg-[color:var(--surface)] p-4" id="answer-review-text">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-caption font-medium text-[#3f4c66]">내 답안 입력 (필수)</p>
                      <span className="rounded-full bg-[#eef2fb] px-2.5 py-1 text-[11px] font-semibold text-[#1e2a46]">최소 입력</span>
                    </div>
                    <Textarea
                      className="min-h-[210px] border-[#c9d1e7] bg-[color:var(--surface)]"
                      placeholder="초안 텍스트가 있으면 붙여 넣고, 없으면 직접 입력해 주세요."
                      value={myAnswerText}
                      onChange={(event) => setMyAnswerText(event.target.value)}
                    />
                  </article>

                  <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
                    <p className="text-caption font-medium text-[color:var(--muted)]">이미지/PDF 입력</p>
                    <p className="mt-1 text-caption leading-5 text-[color:var(--muted)]">텍스트가 가장 빠르지만, 파일 업로드도 바로 사용할 수 있습니다.</p>
                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <section className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--border)] p-3" id="problem-upload">
                  <p className="text-caption font-medium text-[color:var(--muted)]">문제/사례 파일</p>
                  <label
                    htmlFor="answer-review-problem-file-upload"
                    className={cn(buttonVariants({ variant: "outline" }), "w-full cursor-pointer justify-center sm:w-auto")}
                  >
                    파일 선택
                  </label>
                  <input
                    id="answer-review-problem-file-upload"
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={handleProblemFileChange}
                  />
                  <p className="text-caption leading-5 text-[color:var(--muted)]">
                    파일: <span className="font-medium text-[color:var(--foreground-strong)]">{summarizeFiles(problemFiles)}</span>
                  </p>
                </section>

                <section className="space-y-2 rounded-[var(--radius-sm)] border border-[#b7c1dd] bg-[#f8faff] p-3" id="my-answer-upload">
                  <p className="text-caption font-medium text-[#3f4c66]">내 답안 파일</p>
                  <label
                    htmlFor="answer-review-my-answer-file-upload"
                    className={cn(buttonVariants({ variant: "outline" }), "w-full cursor-pointer justify-center sm:w-auto")}
                  >
                    파일 선택
                  </label>
                  <input
                    id="answer-review-my-answer-file-upload"
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={handleMyAnswerFileChange}
                  />
                  <p className="text-caption leading-5 text-[color:var(--muted)]">
                    파일: <span className="font-medium text-[color:var(--foreground-strong)]">{summarizeFiles(myAnswerFiles)}</span>
                  </p>
                </section>

                <section className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--border)] p-3" id="reference-upload">
                  <p className="text-caption font-medium text-[color:var(--muted)]">기준답안 파일 (선택)</p>
                  <label
                    htmlFor="answer-review-reference-file-upload"
                    className={cn(buttonVariants({ variant: "outline" }), "w-full cursor-pointer justify-center sm:w-auto")}
                  >
                    파일 선택
                  </label>
                  <input
                    id="answer-review-reference-file-upload"
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={handleReferenceFileChange}
                  />
                  <p className="text-caption leading-5 text-[color:var(--muted)]">
                    파일: <span className="font-medium text-[color:var(--foreground-strong)]">{summarizeFiles(referenceFiles)}</span>
                  </p>
                </section>
                </div></article>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2" id="answer-review-problem">
                  <p className="text-caption font-medium text-[color:var(--muted)]">문제/사례 입력</p>
                  <Textarea
                    className="min-h-[120px] bg-[color:var(--surface)]"
                    placeholder="문제 요구사항, 사례 조건, 논점 키워드를 입력해 주세요."
                    value={problemText}
                    onChange={(event) => setProblemText(event.target.value)}
                  />
                </div>
                <div className="space-y-2" id="answer-review-reference">
                  <p className="text-caption font-medium text-[color:var(--muted)]">기준답안/기준목차 입력</p>
                  <Textarea
                    className="min-h-[120px] bg-[color:var(--surface)]"
                    placeholder="기준답안 또는 기준목차를 텍스트로 붙여 넣어 주세요."
                    value={referenceAnswerText}
                    onChange={(event) => setReferenceAnswerText(event.target.value)}
                  />
                </div>
              </div>
                </motion.div>

                <motion.aside
                  className="space-y-3 lg:sticky lg:top-6 lg:self-start"
                  initial={shouldReduceMotion ? false : { opacity: 0, x: 10 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut", delay: shouldReduceMotion ? 0 : 0.05 }}
                >
                  <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
                    <p className="text-caption font-medium text-[color:var(--muted)]">입력 준비 상태</p>
                    <div className="mt-3 grid gap-2">
                      <InputStatusCard title="문제/사례" statusText={hasProblemInput ? "입력됨" : "미입력"} helper="선택 입력" />
                      <InputStatusCard title="내 답안" statusText={hasMyAnswer ? "입력됨" : "미입력"} helper="필수 입력" />
                      <InputStatusCard title="기준답안" statusText={hasReferenceAnswer ? "입력됨" : "선택"} helper="선택 입력" />
                    </div>
                  </article>
                  <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
                    <p className="text-caption leading-5 text-[color:var(--muted)]">
                      {hasMyAnswer ? "준비가 완료되었습니다. 바로 검토를 시작하세요." : "내 답안 텍스트 또는 파일을 입력하면 검토를 시작할 수 있습니다."}
                    </p>
                    <motion.button
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                      type="button"
                      className={cn(buttonVariants({ variant: "default" }), "mt-3 w-full")}
                      onClick={handlePrimaryAction}
                      disabled={isPrimaryActionDisabled}
                    >
                      {primaryActionLabel}
                    </motion.button>
                  </article>
                </motion.aside>
              </div>

              {structureError ? <p className="text-caption leading-5 text-[color:var(--muted)]">{structureError}</p> : null}
            </motion.section>
          ) : null}

          {currentStep === 2 ? (
            <AnimatePresence mode="wait">
              <motion.section
                key="studio-step-2"
                id="answer-review-structure-result"
                className="space-y-5"
                initial={shouldReduceMotion ? false : "hidden"}
                animate={shouldReduceMotion ? undefined : "visible"}
                variants={SECTION_FADE}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                <motion.div
                  className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4 sm:p-5"
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-caption text-[color:var(--muted)]">{examMode === "second" ? "감정평가사 2차" : "감정평가사 1차"} · {subject}</p>
                      <h2 className="text-base font-semibold text-[color:var(--foreground-strong)]">답안 리뷰 스튜디오</h2>
                      <p className="text-caption leading-5 text-[color:var(--muted)]">{toShortLine(structureDraft?.nextAction || "", "가장 큰 간극 하나를 먼저 보강하면 다음 초안의 완성도가 올라갑니다.")}</p>
                    </div>
                    <div className="space-y-2 text-right">
                      <p className="text-caption text-[color:var(--muted)]">상태 · {completionStatus}</p>
                      <button type="button" onClick={() => setCurrentStep(1)} className={cn(buttonVariants({ variant: "default" }), "h-9 px-4")}>
                        입력 수정하기
                      </button>
                    </div>
                  </div>
                </motion.div>
                {structureError ? (
                  <article className="rounded-[var(--radius-sm)] border border-[#b9a98a] bg-[#f8f4ea] px-4 py-3">
                    <p className="text-caption font-medium text-[#5a4b32]">검토 오류</p>
                    <p className="mt-1 text-caption leading-5 text-[#5a4b32]">{structureError}</p>
                  </article>
                ) : null}
                {learningSignalStatus === "saved" ? (
                  <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
                    <p className="text-caption leading-5 text-[color:var(--muted)]">
                      학습 신호가 기록되었습니다.{" "}
                      <Link
                        href={examMode === "second" ? "/app?mode=second" : "/app?mode=first"}
                        className="font-medium text-[color:var(--foreground-strong)] underline underline-offset-2"
                      >
                        오늘 확인
                      </Link>
                    </p>
                  </article>
                ) : null}
                {learningSignalStatus === "failed" ? (
                  <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
                    <p className="text-caption leading-5 text-[color:var(--muted)]">
                      학습 신호를 저장하지 못했습니다. 검토자 확인 후 수동 기록해 주세요.
                    </p>
                  </article>
                ) : null}
                {learningSignalStatus === "skipped" ? (
                  <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
                    <p className="text-caption leading-5 text-[color:var(--muted)]">
                      입력 정보가 충분하지 않아 학습 신호 저장은 건너뛰었습니다.
                    </p>
                  </article>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-4">
                    <article className="rounded-[var(--radius-md)] border border-[#27375f] bg-[linear-gradient(150deg,#f8f7f3_0%,#f3f1eb_100%)] p-5">
                      <p className="text-caption font-medium text-[#3f4c66]">가장 큰 간극</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#1e2a46]">{toDetailLine(firstBigGap, "핵심 논점 입력을 보강하면 가장 큰 간극이 자동 정리됩니다.")}</p>
                      <div className="mt-3 space-y-1 text-caption leading-5 text-[#3f4c66]">
                        <p>왜 중요한가: 채점 포인트를 놓치면 논리 전개가 맞아도 점수 회수가 어렵습니다.</p>
                        <p>어떻게 고칠까: {biggestGapFix}</p>
                      </div>
                      <motion.button whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }} type="button" onClick={() => setCurrentStep(1)} className={cn(buttonVariants({ variant: "default" }), "mt-4 h-9 px-4")}>자료 보강하기</motion.button>
                    </article>

                    <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
                      <p className="text-caption font-medium text-[color:var(--muted)]">전체 리뷰</p>
                      <p className="mt-2 text-caption leading-6 text-[color:var(--foreground-strong)]">{toDetailLine(structureDraft?.caution || structureDraft?.requiredIssues || "", "입력을 보강하면 전체 리뷰가 더 구체화됩니다.")}</p>
                    </article>

                    <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
                      <p className="text-caption font-medium text-[color:var(--muted)]">문단/이슈 단위 피드백</p>
                      <ul className="mt-2 space-y-2 text-caption leading-6 text-[color:var(--foreground-strong)]">
                        <li>• 약한 문단 포인트: {toShortLine(structureDraft?.weakParagraphPoint || "", "보강할 문단 포인트를 직접 지정해 주세요.")}</li>
                        <li>• 논리 보강 포인트: {toShortLine(structureDraft?.weakLogicPoint || "", "논리 연결 근거를 한 줄 더 추가해 보세요.")}</li>
                        <li>• 잘한 부분: {toShortLine(structureDraft?.strengths[0] || "", "강점은 유지하고 간극 하나만 우선 보강하세요.")}</li>
                      </ul>
                    </article>

                    <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
                      <p className="text-caption font-medium text-[color:var(--muted)]">추천 다시쓰기 초안</p>
                      <p className="mt-2 text-caption leading-6 text-[color:var(--foreground-strong)]">{toDetailLine(structureDraft?.rewriteDraftSuggestion || structureDraft?.rewriteTarget || "", "추천 다시쓰기 초안이 아직 없습니다. 수동 메모를 활용해 보강하세요.")}</p>
                    </article>
                  </div>

                  <motion.aside
                    className="space-y-3 lg:sticky lg:top-6 lg:self-start"
                    initial={shouldReduceMotion ? false : { opacity: 0, x: 10 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut", delay: shouldReduceMotion ? 0 : 0.08 }}
                  >
                    <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
                      <p className="text-caption text-[color:var(--muted)]">보강 우선도</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-[color:var(--foreground-strong)]">
                        간극 1개 우선 보강
                      </p>
                      <p className="mt-2 text-caption leading-5 text-[color:var(--muted)]">공식 점수 대신 다음 보강 행동을 먼저 실행해 주세요.</p>
                    </article>
                    <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
                      <p className="text-caption font-medium text-[color:var(--muted)]">보조 지표</p>
                      <ul className="mt-2 space-y-1 text-caption leading-5 text-[color:var(--foreground-strong)]">
                        <li>강점 {structureDraft?.strengths.length ?? 0}개</li>
                        <li>누락 후보 {structureDraft?.missingIssueCandidates.length ?? 0}개</li>
                        <li>다음 행동 제안 {structureDraft?.nextAction ? "있음" : "없음"}</li>
                      </ul>
                    </article>
                    <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
                      <p className="text-caption font-medium text-[color:var(--muted)]">다음 행동</p>
                      <div className="mt-2 grid gap-2">
                        <motion.button whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }} type="button" onClick={() => setCurrentStep(1)} className={cn(buttonVariants({ variant: "default" }), "h-9")}>입력 수정하기</motion.button>
                        <motion.button whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }} type="button" onClick={() => setCurrentStep(3)} className={cn(buttonVariants({ variant: "outline" }), "h-9")}>비교/피드백 정리</motion.button>
                      </div>
                    </article>
                  </motion.aside>
                </div>
              </motion.section>
            </AnimatePresence>
          ) : null}

          {currentStep === 3 ? (
            <section className="space-y-3">
              <p className="text-caption leading-5 text-[color:var(--muted)]">전달 전 검토자 확인이 필요합니다.</p>
              <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] p-3 text-caption leading-6 text-[color:var(--foreground-strong)]">
                {feedbackDraftText}
              </pre>
              {didCopyCurrentDraft ? <p className="text-caption leading-5 text-[color:var(--muted)]">복사 완료. 전달 전 검토해 주세요.</p> : null}
              {feedbackCopyStatus === "failed" ? (
                <p className="text-caption leading-5 text-[color:var(--muted)]">클립보드 복사에 실패했습니다. 텍스트를 수동으로 복사해 주세요.</p>
              ) : null}
            </section>
          ) : null}

          <details className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
            <summary className="cursor-pointer text-sm font-medium text-[color:var(--foreground-strong)]">보조 영역 펼치기</summary>
            <div className="mt-3 space-y-3">
              <section id="manual-comparison-preview" className="space-y-2">
                <p className="text-caption font-medium text-[color:var(--muted)]">검토 흐름</p>
                <ul className="space-y-1 text-caption leading-5 text-[color:var(--muted)]">
                  <li>1) 문제/사례 입력</li>
                  <li>2) 내 답안 입력</li>
                  <li>3) 기준답안 입력</li>
                  <li>4) 피드백 전달 전 검수</li>
                </ul>
                <p className="text-caption leading-5 text-[color:var(--muted)]">긴 PDF는 필요한 문제/답안/기준답안 페이지만 나눠 넣는 것이 좋습니다.</p>
                {hasMyAnswer ? (
                  <p className="text-caption leading-5 text-[color:var(--muted)]">
                    입력 요약: 내 답안 {myAnswerText.trim().length}자/{getParagraphCount(myAnswerText)}문단, 기준답안 {referenceAnswerText.trim().length}자/
                    {getParagraphCount(referenceAnswerText)}문단.
                  </p>
                ) : null}
              </section>

              <section className="space-y-3">
                <p className="text-caption font-medium text-[color:var(--muted)]">수동 검토 메모</p>
                <div className="space-y-2">
                  <p className="text-caption font-medium text-[color:var(--muted)]">누락 논점 후보</p>
                  <Textarea
                    className="min-h-[96px] bg-[color:var(--surface)]"
                    placeholder="예: 처분 근거 조문 제시가 누락되어 논증 연결이 약함"
                    value={missingPointMemo}
                    onChange={(event) => setMissingPointMemo(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-caption font-medium text-[color:var(--muted)]">교정 문단</p>
                  <Textarea
                    className="min-h-[120px] bg-[color:var(--surface)]"
                    placeholder="누락 논점을 반영해 보강 문단을 직접 작성해 주세요."
                    value={revisionParagraph}
                    onChange={(event) => setRevisionParagraph(event.target.value)}
                  />
                </div>
              </section>

              <section className="space-y-2">
                <p className="text-caption font-medium text-[color:var(--muted)]">검토자 노트</p>
                <pre className="max-h-[240px] overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3 text-caption leading-6 text-[color:var(--foreground-strong)]">
                  {reviewerNoteText}
                </pre>
              </section>

              <section className="space-y-2">
                <p className="text-caption font-medium text-[color:var(--muted)]">세부 분석</p>
                {structureDraft ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3">
                      <p className="text-caption font-medium text-[color:var(--muted)]">문제 요구</p>
                      <p className="mt-1 text-caption leading-5 text-[color:var(--foreground-strong)]">{toDetailLine(structureDraft.questionSummary, "문제 요구를 더 입력하면 검토 정확도가 높아집니다.")}</p>
                    </article>
                    <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3">
                      <p className="text-caption font-medium text-[color:var(--muted)]">핵심 개념</p>
                      <p className="mt-1 text-caption leading-5 text-[color:var(--foreground-strong)]">
                        {toDetailLine(structureDraft.coreConcepts.length > 0 ? structureDraft.coreConcepts.join(", ") : "", "핵심 개념을 더 입력해 주세요.")}
                      </p>
                    </article>
                    <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3">
                      <p className="text-caption font-medium text-[color:var(--muted)]">필수 논점</p>
                      <p className="mt-1 text-caption leading-5 text-[color:var(--foreground-strong)]">{toDetailLine(structureDraft.requiredIssues, "기준답안과 문제 요구를 더 입력하면 보강할 간극이 선명해집니다.")}</p>
                    </article>
                    <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3">
                      <p className="text-caption font-medium text-[color:var(--muted)]">내 답안 구조</p>
                      <p className="mt-1 text-caption leading-5 text-[color:var(--foreground-strong)]">{toDetailLine(structureDraft.userAnswerStructure, "문단별 주장과 근거를 정리하면 구조 분석이 선명해집니다.")}</p>
                    </article>
                    <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3">
                      <p className="text-caption font-medium text-[color:var(--muted)]">기준답안 구조</p>
                      <p className="mt-1 text-caption leading-5 text-[color:var(--foreground-strong)]">{toDetailLine(structureDraft.referenceStructure, "기준답안의 목차를 입력하면 비교가 정확해집니다.")}</p>
                    </article>
                    <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3">
                      <p className="text-caption font-medium text-[color:var(--muted)]">보강 문단 포인트</p>
                      <p className="mt-1 text-caption leading-5 text-[color:var(--foreground-strong)]">{toDetailLine(structureDraft.weakParagraphPoint, "보강할 문단 포인트를 검토자가 직접 확인해 주세요.")}</p>
                    </article>
                    <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3">
                      <p className="text-caption font-medium text-[color:var(--muted)]">논리 보강 포인트</p>
                      <p className="mt-1 text-caption leading-5 text-[color:var(--foreground-strong)]">{toDetailLine(structureDraft.weakLogicPoint, "논리 연결이 약한 지점을 검토자가 직접 확인해 주세요.")}</p>
                    </article>
                    <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3">
                      <p className="text-caption font-medium text-[color:var(--muted)]">검토 메모</p>
                      <p className="mt-1 text-caption leading-5 text-[color:var(--foreground-strong)]">{toDetailLine(structureDraft.caution, "이 결과는 검토 보조 초안이며 검토자 확인이 필요합니다.")}</p>
                    </article>
                  </div>
                ) : (
                  <p className="text-caption leading-5 text-[color:var(--muted)]">먼저 답안 검토를 실행하면 세부 분석을 확인할 수 있습니다.</p>
                )}
              </section>
            </div>
          </details>
        </section>
      </section>

      <div>
        <Link href="/exams" className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
          시험 선택으로 돌아가기
        </Link>
      </div>
    </RefinedShell>
  );
}
