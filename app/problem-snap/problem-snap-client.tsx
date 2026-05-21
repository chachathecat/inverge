"use client";

import { useMemo, useRef, useState } from "react";

import { RefinedShell } from "@/components/inverge/refined-primitives";
import { ResultFeedbackPrompt } from "@/components/shared/result-feedback-prompt";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AppraisalMode } from "@/lib/review-os/appraisal";

type ExplanationLevel = "easy" | "standard" | "exam";

type ProblemSnapResult = {
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

const SECOND_SUBJECTS = ["감정평가실무", "감정평가이론", "감정평가 및 보상법규"] as const;
const FIRST_SUBJECTS = ["민법", "회계학", "경제학", "감정평가관계법규"] as const;

export default function ProblemSnapClientPage({ initialExamMode }: { initialExamMode: AppraisalMode }) {
  const [examMode, setExamMode] = useState<AppraisalMode>(initialExamMode);
  const [subject, setSubject] = useState<string>(initialExamMode === "first" ? FIRST_SUBJECTS[0] : SECOND_SUBJECTS[0]);
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>("standard");
  const [problemText, setProblemText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProblemSnapResult | null>(null);
  const [referenceGrounding, setReferenceGrounding] = useState<{ used: boolean; displayLabel: string } | null>(null);
  const [savedLocal, setSavedLocal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const subjects = examMode === "first" ? FIRST_SUBJECTS : SECOND_SUBJECTS;

  const resultHeading = useMemo(() => {
    if (explanationLevel === "easy") return "쉽게 풀이";
    if (explanationLevel === "exam") return "시험답안식 풀이";
    return "기본 해설";
  }, [explanationLevel]);

  const showCalculatorGuide = useMemo(() => {
    if (!result) return false;
    const hasSignal = result.calculatorGuide.keystrokeSteps.some((step) => step && step !== "계산기 입력 없음")
      || result.calculatorGuide.recommendedMode !== "검토 필요";
    return subject === "감정평가실무" || hasSignal;
  }, [result, subject]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
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
      setReferenceGrounding(json.referenceGrounding ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "문제 풀이를 생성하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RefinedShell className="space-y-6 py-6 sm:py-10">
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
          <input ref={cameraInputRef} className="hidden" type="file" accept="image/*" capture="environment" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          <input ref={fileInputRef} className="hidden" type="file" accept="image/*,.pdf" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          <p className="text-xs text-[color:var(--muted)]">선택 파일 {files.length}개</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">모드
            <select className="mt-1 w-full rounded border p-2" value={examMode} onChange={(e) => {
              const nextMode = e.target.value === "first" ? "first" : "second";
              setExamMode(nextMode);
              setSubject(nextMode === "first" ? FIRST_SUBJECTS[0] : SECOND_SUBJECTS[0]);
            }}>
              <option value="second">2차</option><option value="first">1차</option>
            </select>
          </label>
          <label className="text-sm">과목
            <select className="mt-1 w-full rounded border p-2" value={subject} onChange={(e) => setSubject(e.target.value)}>
              {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm">해설 난이도
            <select className="mt-1 w-full rounded border p-2" value={explanationLevel} onChange={(e) => setExplanationLevel(e.target.value as ExplanationLevel)}>
              <option value="easy">쉽게 풀이</option><option value="standard">기본 해설</option><option value="exam">시험답안식</option>
            </select>
          </label>
        </div>

        <label className="block text-sm">문제 텍스트 (선택)
          <Textarea id="problemText" className="mt-1 min-h-[140px]" value={problemText} onChange={(e) => setProblemText(e.target.value)} />
        </label>
        <button disabled={loading} className={cn(buttonVariants({ variant: "default" }), "h-10")}>문제 풀이 흐름 만들기</button>
        <p className="text-xs text-[color:var(--muted)]">정답 확정이 아닌 학습 보조입니다. 원문·계산·단위를 직접 확인해 주세요.</p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      {result ? (
        <section className="space-y-4 rounded-[var(--radius-xl)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">가장 먼저 이해할 1가지</p><p className="mt-1 text-sm">{result.problemSummary}</p></div>
            <div className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">핵심 공식/논점</p><p className="mt-1 text-sm">{result.formulas[0] ?? result.requiredConcepts[0] ?? "핵심 논점 확인 필요"}</p></div>
            <div className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">지금 다시 풀 행동 1개</p><p className="mt-1 text-sm">{result.nextPracticeAction}</p></div>
            <div className="rounded-[var(--radius-md)] border p-3"><p className="text-xs text-[color:var(--muted)]">주의할 함정 1개</p><p className="mt-1 text-sm">{result.commonMistakes[0] ?? result.caution}</p></div>
          </div>
          <p className="text-xs text-[color:var(--muted)]">{referenceGrounding?.used ? `유사 기출 Skeleton을 참고해 정리했습니다. ${referenceGrounding.displayLabel}` : "입력 자료 기준으로 정리했습니다."}</p>
          <div><h3 className="font-medium">{resultHeading}</h3><p>{result.easyExplanation}</p></div>
          {showCalculatorGuide ? (
            <div className="space-y-2 rounded-[var(--radius-md)] border bg-[color:var(--surface-subtle)] p-3"><h3 className="font-medium">CASIO fx-9860GIII 계산 가이드</h3><p className="text-sm">{result.calculatorGuide.calculationPurpose}</p></div>
          ) : (
            <p className="rounded-[var(--radius-md)] border border-dashed p-3 text-sm text-[color:var(--muted)]">계산기 입력보다 개념 구조가 중요한 문제입니다.</p>
          )}
          <div className="rounded-[var(--radius-md)] border p-3">
            <p className="text-sm font-medium">품질 점검</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• 문제 인식 확인 필요</li>
              <li>• 공식 확인 필요</li>
              <li>• 숫자/단위 확인 필요</li>
              <li>• 계산기 입력 확인 필요</li>
            </ul>
          </div>
          <button type="button" onClick={() => setSavedLocal(true)} className={cn(buttonVariants({ variant: "outline" }), "h-10")}>이 문제를 복습 큐에 저장</button>
          <p className="text-xs text-[color:var(--muted)]">{savedLocal ? "복습 큐 연결 준비됨" : "저장하면 복습 연결 준비 상태로 표시됩니다."}</p>
          <ResultFeedbackPrompt route="/problem-snap" pageContext={{ section: "problem-snap-result", examMode, subject }} />
        </section>
      ) : null}
    </RefinedShell>
  );
}
