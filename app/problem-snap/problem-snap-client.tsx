"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { RefinedShell } from "@/components/inverge/refined-primitives";
import { StandaloneLearnerToolNav } from "@/components/review-os/standalone-learner-tool-nav";
import { ResultFeedbackPrompt } from "@/components/shared/result-feedback-prompt";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { normalizeSubjectForMode, type AppraisalMode } from "@/lib/review-os/appraisal";
import { APPRAISAL_FIRST_SUBJECTS, APPRAISAL_SECOND_SUBJECTS } from "@/lib/review-os/types";
import { cn } from "@/lib/utils";

type ExplanationLevel = "easy" | "standard" | "exam";

type ProblemSnapResult = {
  problemSummaryDraft?: string;
  askTypeDraft?: string;
  extractedConditions?: string[];
  extractedNumbersAndUnits?: string[];
  missingOrUnclearParts?: string[];
  calculatorGuide: {
    calculatorModel: "CASIO fx-9860GIII";
    calculationPurpose: string;
    recommendedMode: "RUN-MAT" | "EQUA" | "MAT" | "STAT" | "TVM" | "Spreadsheet" | "검토 필요";
    keystrokeSteps: string[];
    expectedDisplay?: string;
    answerRounding?: string;
    caution: string;
  };
  problemSummary: string;
  askType: string;
  requiredConcepts: string[];
  formulas: string[];
  easyExplanation: string;
  stepByStepSolution: string[];
  examStyleStructure: string[];
  commonMistakes: string[];
  nextPracticeAction: string;
  caution: string;
};

const CALCULATOR_STEP_FALLBACK = "계산/CASIO 스텝은 확인이 필요합니다. 원문 숫자와 단위를 직접 확인해 주세요.";

const isMeaningfulCalculatorValue = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) return false;
  return !["확인 필요", "검토 필요", "없음", "계산기 입력 없음", "입력 없음", "해당 없음"].some((placeholder) =>
    normalized.includes(placeholder),
  );
};

const hasCalculatorGuideData = (guide: ProblemSnapResult["calculatorGuide"]) =>
  isMeaningfulCalculatorValue(guide.calculationPurpose) ||
  isMeaningfulCalculatorValue(guide.expectedDisplay) ||
  isMeaningfulCalculatorValue(guide.answerRounding) ||
  isMeaningfulCalculatorValue(guide.caution) ||
  guide.recommendedMode !== "검토 필요" ||
  guide.keystrokeSteps.some(isMeaningfulCalculatorValue);

export default function ProblemSnapClientPage({
  initialExamMode,
  initialSubject,
}: {
  initialExamMode: AppraisalMode;
  initialSubject?: string;
}) {
  const router = useRouter();
  const [examMode, setExamMode] = useState<AppraisalMode>(initialExamMode);
  const [subject, setSubject] = useState<string>(normalizeSubjectForMode(initialSubject, initialExamMode));
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>("standard");
  const [problemText, setProblemText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProblemSnapResult | null>(null);
  const [referenceGrounding, setReferenceGrounding] = useState<{ used: boolean; displayLabel: string } | null>(null);
  const [savedLocal, setSavedLocal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "failed" | "local_fallback">("idle");
  const [recognitionConfirmed, setRecognitionConfirmed] = useState(false);
  const [recognizedTextDraft, setRecognizedTextDraft] = useState("");
  const [lastInputSource, setLastInputSource] = useState<"camera" | "file" | null>(null);
  const [retryMode, setRetryMode] = useState(false);
  const [retryMemo, setRetryMemo] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const subjects = examMode === "first" ? APPRAISAL_FIRST_SUBJECTS : APPRAISAL_SECOND_SUBJECTS;

  const resultHeading = useMemo(() => {
    if (explanationLevel === "easy") return "쉽게 풀이";
    if (explanationLevel === "exam") return "시험답안식 풀이";
    return "기본 해설";
  }, [explanationLevel]);

  const showCalculatorGuide = useMemo(() => {
    if (!result) return false;
    return subject === "감정평가실무" || hasCalculatorGuideData(result.calculatorGuide);
  }, [result, subject]);

  const getProblemSnapSubjectView = (currentSubject: string) => {
    if (examMode === "first") return "first";
    if (currentSubject === "감정평가실무") return "practice";
    if (currentSubject === "감정평가이론") return "theory";
    return "law";
  };
  const getRetryLink = (currentExamMode: AppraisalMode, currentSubject: string) =>
    `/answer-review?mode=${currentExamMode}&subject=${encodeURIComponent(currentSubject)}&source=problem-snap`;

  const bridgeToAnswerReview = (currentResult: ProblemSnapResult) => {
    try {
      const handoffPayload = {
        source: "problem-snap",
        examMode,
        subject,
        problemSummary: currentResult.problemSummary,
        problemText: currentResult.problemSummaryDraft || currentResult.problemSummary,
        extractedConditions: currentResult.extractedConditions,
        retryMemo,
        requiredConcepts: currentResult.requiredConcepts,
        formulas: currentResult.formulas,
        nextPracticeAction: currentResult.nextPracticeAction,
        createdAt: new Date().toISOString(),
      };
      sessionStorage.setItem("inverge.problemSnap.answerReviewHandoff", JSON.stringify(handoffPayload));
    } catch {
      // Degraded fallback: continue navigation without handoff prefill.
    }
    router.push(getRetryLink(examMode, subject));
  };

  const renderListOrFallback = (items: string[] | undefined, fallback: string) => {
    const validItems = (items ?? []).filter((item) => item.trim());
    if (validItems.length === 0) return <p className="mt-1 text-sm">{fallback}</p>;
    return (
      <ul className="mt-1 space-y-1 text-sm">
        {validItems.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
      </ul>
    );
  };

  const renderCalculatorStepPanel = (currentResult: ProblemSnapResult) => {
    const guide = currentResult.calculatorGuide;
    const hasGuideData = hasCalculatorGuideData(guide);
    const calculationSteps = currentResult.stepByStepSolution.filter(isMeaningfulCalculatorValue);
    const keystrokeSteps = guide.keystrokeSteps.filter(isMeaningfulCalculatorValue);
    const caution = isMeaningfulCalculatorValue(guide.caution) ? guide.caution : "단위와 반올림 기준 확인 필요";

    return (
      <div
        className="space-y-3 rounded-[var(--radius-md)] border bg-[color:var(--surface-subtle)] p-3"
        data-problem-snap-calculator-step
      >
        <div className="space-y-1">
          <h3 className="font-medium">계산/CASIO 스텝</h3>
          {!hasGuideData ? <p className="text-sm text-[color:var(--muted)]">{CALCULATOR_STEP_FALLBACK}</p> : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-[var(--radius-sm)] border bg-[color:var(--surface)] p-3">
            <p className="text-xs text-[color:var(--muted)]">계산 목적</p>
            <p className="mt-1 text-sm">{isMeaningfulCalculatorValue(guide.calculationPurpose) ? guide.calculationPurpose : "확인 필요"}</p>
          </div>
          <div className="rounded-[var(--radius-sm)] border bg-[color:var(--surface)] p-3">
            <p className="text-xs text-[color:var(--muted)]">추천 모드</p>
            <p className="mt-1 text-sm">{guide.recommendedMode}</p>
          </div>
          <div className="rounded-[var(--radius-sm)] border bg-[color:var(--surface)] p-3">
            <p className="text-xs text-[color:var(--muted)]">계산 순서</p>
            {renderListOrFallback(calculationSteps, "계산 순서 확인 필요")}
          </div>
          <div className="rounded-[var(--radius-sm)] border bg-[color:var(--surface)] p-3">
            <p className="text-xs text-[color:var(--muted)]">CASIO 입력</p>
            {renderListOrFallback(keystrokeSteps, "입력 순서 확인 필요")}
          </div>
          <div className="rounded-[var(--radius-sm)] border bg-[color:var(--surface)] p-3">
            <p className="text-xs text-[color:var(--muted)]">화면에 보여야 할 값</p>
            <p className="mt-1 text-sm">{isMeaningfulCalculatorValue(guide.expectedDisplay) ? guide.expectedDisplay : "확인 필요"}</p>
          </div>
          <div className="rounded-[var(--radius-sm)] border bg-[color:var(--surface)] p-3">
            <p className="text-xs text-[color:var(--muted)]">답안에 적을 값</p>
            <p className="mt-1 text-sm">{isMeaningfulCalculatorValue(guide.answerRounding) ? guide.answerRounding : "확인 필요"}</p>
          </div>
        </div>
        <p className="text-xs text-[color:var(--muted)]">단위/반올림 주의: {caution}</p>
      </div>
    );
  };

  const renderSubjectSpecificCards = (
    view: "practice" | "theory" | "law" | "first",
    currentResult: ProblemSnapResult
  ) => {
    if (view === "practice") {
      return [
        <div key="practice-conditions" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">조건 정리</p>{renderListOrFallback(currentResult.extractedConditions, "조건 확인 필요")}</div>,
        <div key="practice-formulas" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">핵심 산식</p>{renderListOrFallback(currentResult.formulas, "산식 확인 필요")}</div>,
        <div key="practice-steps" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">계산 순서</p>{renderListOrFallback(currentResult.stepByStepSolution, "계산 순서 확인 필요")}</div>,
        <div key="practice-casio" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">CASIO 입력</p>{renderListOrFallback(currentResult.calculatorGuide.keystrokeSteps, "입력 순서 확인 필요")}</div>,
        <div key="practice-rounding" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">단위/반올림</p><p className="mt-1 text-sm">{currentResult.calculatorGuide.answerRounding || currentResult.calculatorGuide.caution || "단위·반올림 확인 필요"}</p></div>,
        <div key="practice-answer" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">답안에 적을 값</p><p className="mt-1 text-sm">{currentResult.calculatorGuide.expectedDisplay || currentResult.nextPracticeAction || "답안 기재값 확인 필요"}</p></div>,
      ];
    }
    if (view === "theory") {
      return [
        <div key="theory-definition" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">개념 정의</p>{renderListOrFallback(currentResult.requiredConcepts, "개념 정의 확인 필요")}</div>,
        <div key="theory-contrast" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">비교/대립 논점</p>{renderListOrFallback(currentResult.commonMistakes, "비교 논점 확인 필요")}</div>,
        <div key="theory-outline" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">답안 목차</p>{renderListOrFallback(currentResult.examStyleStructure, "목차 확인 필요")}</div>,
        <div key="theory-keyword" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">필수 키워드</p>{renderListOrFallback(currentResult.requiredConcepts, "키워드 확인 필요")}</div>,
        <div key="theory-example" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">사례 적용 문장</p><p className="mt-1 text-sm">{currentResult.easyExplanation || currentResult.nextPracticeAction || "사례 적용 문장 확인 필요"}</p></div>,
      ];
    }
    if (view === "law") {
      return [
        <div key="law-issue" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">쟁점</p><p className="mt-1 text-sm">{currentResult.askType || "쟁점 확인 필요"}</p></div>,
        <div key="law-elements" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">조문/요건</p>{renderListOrFallback(currentResult.requiredConcepts, "조문/요건 확인 필요")}</div>,
        <div key="law-process" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">절차</p>{renderListOrFallback(currentResult.stepByStepSolution, "절차 확인 필요")}</div>,
        <div key="law-application" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">사안 포섭</p>{renderListOrFallback(currentResult.examStyleStructure, "사안 포섭 확인 필요")}</div>,
        <div key="law-conclusion" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">결론 문장</p><p className="mt-1 text-sm">{currentResult.nextPracticeAction || "결론 문장 확인 필요"}</p></div>,
      ];
    }
    return [
      <div key="first-concepts" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">개념 확인</p>{renderListOrFallback(currentResult.requiredConcepts, "개념 확인 필요")}</div>,
      <div key="first-checkpoint" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">체크포인트</p>{renderListOrFallback(currentResult.commonMistakes, "체크포인트 확인 필요")}</div>,
      <div key="first-retry" className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">다시 풀 행동</p><p className="mt-1 text-sm">{currentResult.nextPracticeAction || "다시 풀 행동 확인 필요"}</p></div>,
    ];
  };
  const renderPrimarySubjectCards = (view: "practice" | "theory" | "law" | "first", currentResult: ProblemSnapResult) => {
    const cards = renderSubjectSpecificCards(view, currentResult);
    return cards.slice(0, 4);
  };

  const getPrimaryPracticeAction = (currentSubject: string, currentResult: ProblemSnapResult) =>
    getProblemSnapSubjectView(currentSubject) === "practice"
      ? currentResult.nextPracticeAction || currentResult.calculatorGuide.answerRounding || "단위·반올림 기준을 적고 다시 계산해 보세요."
      : currentResult.nextPracticeAction;

  const getSubjectSpecificCaution = (currentSubject: string, currentResult: ProblemSnapResult) =>
    getProblemSnapSubjectView(currentSubject) === "practice"
      ? currentResult.calculatorGuide.caution || currentResult.caution
      : currentResult.commonMistakes[0] ?? currentResult.caution;

  const hasMeaningfulValue = (items?: string[]) =>
    (items ?? []).some((item) => {
      const normalized = item.trim();
      if (!normalized) return false;
      return !["확인 필요", "검토 필요", "없음"].some((placeholder) => normalized.includes(placeholder));
    });

  const syncRecognitionDraftFromInputs = (nextProblemText: string, nextFilesCount: number) => {
    if (nextProblemText.trim()) {
      setRecognizedTextDraft(nextProblemText);
      return;
    }
    if (nextFilesCount > 0) {
      setRecognizedTextDraft(`파일 ${nextFilesCount}개 제출 — 원문 확인 필요`);
      return;
    }
    setRecognizedTextDraft("");
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setRecognitionConfirmed(false);
    setSaveStatus("idle");
    setRetryMode(false);
    setRetryMemo("");
    try {
      const formData = new FormData();
      formData.set("examMode", examMode);
      formData.set("subject", subject);
      formData.set("explanationLevel", explanationLevel);
      formData.set("problemText", problemText);
      files.forEach((file) => formData.append("problemFiles", file));
      const response = await fetch("/api/problem-snap/solve", { method: "POST", body: formData });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error ?? "문제 풀이를 생성하지 못했습니다.");
      setResult(json.result);
      setRecognizedTextDraft((json.result.problemSummaryDraft as string | undefined) || problemText || (files.length > 0 ? `파일 ${files.length}개 제출 — 원문 확인 필요` : "확인 필요"));
      setReferenceGrounding(json.referenceGrounding ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "문제 풀이를 생성하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function onSaveToReviewQueue() {
    if (!result) return;
    setSaveStatus("saving");
    try {
      const response = await fetch("/api/problem-snap/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "problem-snap",
          examMode,
          subject,
          problemSummary: result.problemSummary,
          requiredConcepts: result.requiredConcepts,
          formulas: result.formulas,
          commonMistakes: result.commonMistakes,
          nextPracticeAction: result.nextPracticeAction,
          createdAt: new Date().toISOString(),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "복습 큐 저장에 실패했습니다.");
      setSaveStatus("saved");
      setSavedLocal(false);
    } catch {
      try {
        const key = "inverge.problemSnap.localQueue";
        const existing = localStorage.getItem(key);
        const queue = existing ? JSON.parse(existing) : [];
        queue.push({ examMode, subject, savedAt: new Date().toISOString(), result });
        localStorage.setItem(key, JSON.stringify(queue));
        const wrote = localStorage.getItem(key);
        if (wrote) {
          setSavedLocal(true);
          setSaveStatus("local_fallback");
          return;
        }
      } catch {}
      setSavedLocal(false);
      setSaveStatus("failed");
    }
  }

  return (
    <RefinedShell className="space-y-6 py-6 sm:py-10">
      <StandaloneLearnerToolNav mode={examMode} subject={subject} />
      <section className="space-y-2 rounded-[var(--radius-xl)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-5">
        <p className="text-xs text-[color:var(--muted)]">문제 스냅 튜터 · 단계 1/2</p>
        <h1 className="text-2xl font-semibold">문제 스냅 풀이</h1>
        <p className="text-sm text-[color:var(--muted)]">사진·PDF·텍스트를 바탕으로 핵심 논점과 다음 행동을 정리합니다.</p>
      </section>
      <form onSubmit={onSubmit} className="space-y-4 rounded-[var(--radius-xl)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-5">
        <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-subtle)] p-4 space-y-3">
          <p className="text-sm font-medium">입력 준비</p>
          <button type="button" onClick={() => cameraInputRef.current?.click()} className={cn(buttonVariants({ variant: "default" }), "h-11 w-full justify-center text-sm font-semibold")}>문제 사진 찍기</button>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className={cn(buttonVariants({ variant: "outline" }), "h-10 w-full justify-center text-sm")}>PDF/사진 불러오기</button>
            <button type="button" onClick={() => document.getElementById("problemText")?.focus()} className={cn(buttonVariants({ variant: "outline" }), "h-10 w-full justify-center text-sm")}>텍스트 붙여넣기</button>
          </div>
          <input ref={cameraInputRef} className="hidden" type="file" accept="image/*" capture="environment" multiple onChange={(e) => { const nextFiles = Array.from(e.target.files ?? []); setFiles(nextFiles); setLastInputSource("camera"); if (!recognitionConfirmed) syncRecognitionDraftFromInputs(problemText, nextFiles.length); else setRecognitionConfirmed(false); }} />
          <input ref={fileInputRef} className="hidden" type="file" accept="image/*,.pdf" multiple onChange={(e) => { const nextFiles = Array.from(e.target.files ?? []); setFiles(nextFiles); setLastInputSource("file"); if (!recognitionConfirmed) syncRecognitionDraftFromInputs(problemText, nextFiles.length); else setRecognitionConfirmed(false); }} />
          <p className="text-xs text-[color:var(--muted)]">선택 파일 {files.length}개</p>
          {files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded border px-3 py-2 text-xs">
                  <div>
                    <p>{file.name}</p>
                    <p className="text-[color:var(--muted)]">{file.type || "확인 필요"}</p>
                  </div>
                  <button type="button" className="underline" onClick={() => setFiles((prev) => { const nextFiles = prev.filter((_, i) => i !== index); if (!recognitionConfirmed) syncRecognitionDraftFromInputs(problemText, nextFiles.length); else setRecognitionConfirmed(false); return nextFiles; })}>삭제</button>
                </div>
              ))}
              {lastInputSource === "camera" ? (
                <button type="button" className={cn(buttonVariants({ variant: "outline" }), "h-9")} onClick={() => cameraInputRef.current?.click()}>다시 찍기</button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">모드
            <select className="mt-1 w-full rounded border p-2" value={examMode} onChange={(e) => {
              const nextMode = e.target.value === "first" ? "first" : "second";
              setExamMode(nextMode);
              setSubject(normalizeSubjectForMode(subject, nextMode));
              if (recognitionConfirmed) setRecognitionConfirmed(false);
            }}>
              <option value="second">2차</option><option value="first">1차</option>
            </select>
          </label>
          <label className="text-sm">과목
            <select className="mt-1 w-full rounded border p-2" value={subject} onChange={(e) => { setSubject(e.target.value); if (recognitionConfirmed) setRecognitionConfirmed(false); }}>
              {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm">해설 난이도
            <select className="mt-1 w-full rounded border p-2" value={explanationLevel} onChange={(e) => { setExplanationLevel(e.target.value as ExplanationLevel); if (recognitionConfirmed) setRecognitionConfirmed(false); }}>
              <option value="easy">쉽게 풀이</option><option value="standard">기본 해설</option><option value="exam">시험답안식</option>
            </select>
          </label>
        </div>

        <label className="block text-sm">문제 텍스트 (선택)
          <Textarea id="problemText" className="mt-1 min-h-[140px]" value={problemText} onChange={(e) => { const nextText = e.target.value; setProblemText(nextText); if (!recognitionConfirmed) syncRecognitionDraftFromInputs(nextText, files.length); else setRecognitionConfirmed(false); }} />
        </label>
        <section className="rounded-[var(--radius-md)] border p-3 space-y-2">
          <p className="text-sm font-medium">문제 인식 확인</p>
          <p className="text-xs text-[color:var(--muted)]">인식된 내용을 확인·수정한 뒤 풀이를 생성합니다.</p>
          <label className="block text-xs">인식 텍스트 초안
            <Textarea className="mt-1 min-h-[84px]" value={recognizedTextDraft} onChange={(e) => setRecognizedTextDraft(e.target.value)} />
          </label>
          <button type="button" className={cn(buttonVariants({ variant: "outline" }), "h-8")} onClick={() => { if (recognizedTextDraft.trim()) { setProblemText(recognizedTextDraft); } setRecognitionConfirmed(true); }}>인식 내용 확정</button>
        </section>
        <button disabled={loading || !recognitionConfirmed} className={cn(buttonVariants({ variant: "default" }), "h-10")}>문제 풀이 흐름 만들기</button>
        <p className="text-xs text-[color:var(--muted)]">정답 확정이 아니라 학습 보조 풀이입니다. 원문·계산·단위를 직접 확인해 주세요.</p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      {result ? (
        <section className="space-y-4 rounded-[var(--radius-xl)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">가장 먼저 이해할 1가지</p><p className="mt-1 text-sm">{result.problemSummary}</p></div>
            <div className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">지금 다시 풀 행동 1개</p><p className="mt-1 text-sm">{getPrimaryPracticeAction(subject, result)}</p></div>
            <div className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">주의할 함정 1개</p><p className="mt-1 text-sm">{getSubjectSpecificCaution(subject, result)}</p></div>
          </div>
          <p className="text-xs text-[color:var(--muted)]">{referenceGrounding?.used ? `유사 기출 Skeleton을 참고해 정리했습니다. ${referenceGrounding.displayLabel}` : "입력 자료 기준으로 정리했습니다."}</p>
          {!retryMode ? (
            showCalculatorGuide ? (
              renderCalculatorStepPanel(result)
            ) : (
              <p className="rounded-[var(--radius-md)] border border-dashed p-3 text-sm text-[color:var(--muted)]">계산기 입력보다 개념 구조가 중요한 문제입니다.</p>
            )
          ) : null}
          {!retryMode ? <div><h3 className="font-medium">{resultHeading}</h3><p>{result.easyExplanation}</p></div> : null}
          {!retryMode ? <div className="grid gap-3 sm:grid-cols-2">{renderPrimarySubjectCards(getProblemSnapSubjectView(subject), result)}</div> : null}
          <details className="rounded-[var(--radius-md)] border p-3">
            <summary className="cursor-pointer text-sm font-medium">자세히 보기</summary>
            <div className="mt-2 space-y-2">
              <p className="text-xs font-medium">문제 인식 확인</p>
              <p className="text-xs">문제 요약: {result.problemSummaryDraft || result.problemSummary || "확인 필요"}</p>
              <p className="text-xs">요구 유형: {result.askTypeDraft || result.askType || "확인 필요"}</p>
              <p className="text-xs">읽은 조건: {(result.extractedConditions ?? ["확인 필요"]).join(" · ")}</p>
              <p className="text-xs">숫자·단위: {(result.extractedNumbersAndUnits ?? ["확인 필요"]).join(" · ")}</p>
              <p className="text-xs">불명확한 부분: {(result.missingOrUnclearParts ?? ["확인 필요"]).join(" · ")}</p>
              <p className="mt-3 text-xs font-medium">품질 점검</p>
              <ul className="space-y-1 text-xs">
                <li>• 문제 인식 <span className="font-medium">{result.problemSummary ? "정상" : "확인 필요"}</span></li>
                <li>• 공식 <span className="font-medium">{hasMeaningfulValue(result.formulas) ? "정상" : "확인 필요"}</span></li>
                <li>• 숫자/단위 <span className="font-medium">{hasMeaningfulValue(result.extractedNumbersAndUnits) ? "정상" : "확인 필요"}</span></li>
              </ul>
            </div>
          </details>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="button" onClick={() => setRetryMode((prev) => !prev)} className={cn(buttonVariants({ variant: "default" }), "h-10")}>해설 가리고 다시 풀기</button>
            <button type="button" onClick={onSaveToReviewQueue} className={cn(buttonVariants({ variant: "outline" }), "h-10")}>복습 큐에 저장</button>
          </div>
          {retryMode ? <div className="space-y-2 rounded-[var(--radius-md)] border p-3"><p className="text-sm">문제 요약</p><p className="text-sm">핵심 조건</p><label className="text-sm">빈 답안 메모<Textarea className="mt-1 min-h-[80px]" value={retryMemo} onChange={(e) => setRetryMemo(e.target.value)} /></label><button type="button" className={cn(buttonVariants({ variant: "outline" }), "h-10 inline-flex")} onClick={() => bridgeToAnswerReview(result)}>Answer Review로 내 풀이 검토하기</button><button type="button" onClick={() => setRetryMode(false)} className={cn(buttonVariants({ variant: "ghost" }), "h-9")}>해설 다시 보기</button></div> : null}
          <p className="text-xs text-[color:var(--muted)]">{saveStatus === "saving" ? "저장 중" : saveStatus === "saved" ? "저장됨" : saveStatus === "failed" ? "저장 실패" : saveStatus === "local_fallback" || savedLocal ? "로컬 임시 저장" : "저장하면 복습 연결 준비 상태로 표시됩니다."}</p>
          <ResultFeedbackPrompt route="/problem-snap" pageContext={{ section: "problem-snap-result", examMode, subject }} />
        </section>
      ) : null}
    </RefinedShell>
  );
}
