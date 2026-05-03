"use client";
import { useState } from "react";
import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SecondQuestionType = "auto" | "theory" | "law" | "practice";
type GradeSecondResponse = { ok: true; mode: "problem_only" | "grade_answer"; result: any } | { ok: false; error: string };

export default function SecondGradingClient() { /* omitted for brevity */
  const [subject, setSubject] = useState("감정평가실무");
  const [questionType, setQuestionType] = useState<SecondQuestionType>("auto");
  const [questionText, setQuestionText] = useState("");
  const [userAnswerText, setUserAnswerText] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [mode, setMode] = useState<"problem_only" | "grade_answer" | null>(null);

  const runSecondGrading = async () => {
    setIsGrading(true); setError(null); setResult(null);
    try {
      const response = await fetch("/api/answer-review/grade-second", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, questionType, questionText, userAnswerText, referenceText }) });
      const payload = (await response.json()) as GradeSecondResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.ok ? "2차 채점 결과를 불러오지 못했습니다." : payload.error);
      setMode(payload.mode); setResult(payload.result);
    } catch (e) { setError(e instanceof Error ? e.message : "2차 채점 요청 중 오류가 발생했습니다."); }
    finally { setIsGrading(false); }
  };

  return <RefinedShell className="space-y-4 py-6 sm:py-10"><section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-4 sm:p-6"><div className="flex flex-wrap items-center gap-2"><RefinedBadge>학원용 답안 운영 콘솔</RefinedBadge><RefinedBadge tone="amber">강사/첨삭자용 채점 초안</RefinedBadge></div><p className="text-caption leading-5 text-[color:var(--muted)]">최종 판단 전 강사 검수 필수 · 공식 점수 아님 · 공식 모범답안 아님 · 훈련/진단용 결과</p><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-2 text-caption font-medium text-[color:var(--muted)]">과목<select className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm" value={subject} onChange={(e)=>setSubject(e.target.value)}><option>감정평가실무</option><option>감정평가이론</option><option>감정평가 및 보상법규</option></select></label><label className="space-y-2 text-caption font-medium text-[color:var(--muted)]">문제 유형<select className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm" value={questionType} onChange={(e)=>setQuestionType(e.target.value as SecondQuestionType)}><option value="auto">자동분류</option><option value="theory">이론형</option><option value="law">법규형</option><option value="practice">실무형</option></select></label></div><div className="space-y-2"><p className="text-caption font-medium text-[color:var(--muted)]">문제</p><Textarea className="min-h-[120px]" value={questionText} onChange={(e)=>setQuestionText(e.target.value)} /></div><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><p className="text-caption font-medium text-[color:var(--muted)]">내 답안 (선택)</p><Textarea className="min-h-[140px]" value={userAnswerText} onChange={(e)=>setUserAnswerText(e.target.value)} /></div><div className="space-y-2"><p className="text-caption font-medium text-[color:var(--muted)]">기준답안/참고답안 (선택)</p><Textarea className="min-h-[140px]" value={referenceText} onChange={(e)=>setReferenceText(e.target.value)} /></div></div><button type="button" onClick={() => void runSecondGrading()} className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-auto")} disabled={isGrading}>{isGrading ? "채점 중..." : "2차 채점 실행"}</button>{error ? <article className="rounded-[var(--radius-sm)] border border-[#b9a98a] bg-[#f8f4ea] px-4 py-3 text-caption text-[#5a4b32]">{error}</article> : null}{result ? <div className="space-y-3"><article className="rounded-[var(--radius-sm)] border border-[var(--border)] p-3"><p className="font-medium">Ⅰ. 논점 게이트 판정</p><p className="text-caption">{result.issueGate?.reason}</p></article><article className="rounded-[var(--radius-sm)] border border-[var(--border)] p-3"><p className="font-medium">Ⅱ. 문제 유형 및 동적 가중치</p><p className="text-caption">{result.questionType} · {result.subject}</p></article><article className="rounded-[var(--radius-sm)] border border-[var(--border)] p-3"><p className="font-medium">Ⅲ. 항목별 부분점수</p><pre className="text-caption whitespace-pre-wrap">{JSON.stringify(result.rubricScores, null, 2)}</pre></article><article className="rounded-[var(--radius-sm)] border border-[var(--border)] p-3"><p className="font-medium">Ⅳ. 감점 분석표</p><pre className="text-caption whitespace-pre-wrap">{JSON.stringify(result.deductions, null, 2)}</pre></article>{mode === "grade_answer" ? <article className="rounded-[var(--radius-sm)] border border-[var(--border)] p-3"><p className="font-medium">Ⅴ. 최종 점수</p><p>{result.finalScore}</p></article> : null}{mode === "grade_answer" ? <article className="rounded-[var(--radius-sm)] border border-[var(--border)] p-3"><p className="font-medium">Ⅵ. 합격 확률 시뮬레이션</p><pre className="text-caption whitespace-pre-wrap">{JSON.stringify(result.passProbabilitySimulation, null, 2)}</pre></article> : null}<article className="rounded-[var(--radius-sm)] border border-[var(--border)] p-3"><p className="font-medium">Ⅶ. 모범답안 구조 Skeleton</p><p className="text-caption">훈련용 구조 초안(공식 모범답안 아님)</p></article>{mode === "grade_answer" ? <article className="rounded-[var(--radius-sm)] border border-[var(--border)] p-3"><p className="font-medium">Ⅷ. 핵심 개선 전략 Top 3</p><pre className="text-caption whitespace-pre-wrap">{JSON.stringify(result.notes?.slice(0,3), null, 2)}</pre></article> : null}<article className="rounded-[var(--radius-sm)] border border-[var(--border)] p-3"><p className="font-medium">Ⅸ. 약점 타격 문제</p><pre className="text-caption whitespace-pre-wrap">{JSON.stringify(result.weaknessDrill, null, 2)}</pre></article></div> : null}</section></RefinedShell>;
}
