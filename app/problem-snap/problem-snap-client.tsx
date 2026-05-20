"use client";

import { useMemo, useState } from "react";

import type { AppraisalMode } from "@/lib/review-os/appraisal";

type ExplanationLevel = "easy" | "standard" | "exam";
type ProblemSnapResult = {
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

export default function ProblemSnapClientPage({ initialExamMode }: { initialExamMode: AppraisalMode }) {
  const [examMode, setExamMode] = useState<AppraisalMode>(initialExamMode);
  const [subject, setSubject] = useState("감정평가실무");
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>("standard");
  const [problemText, setProblemText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProblemSnapResult | null>(null);

  const resultHeading = useMemo(() => {
    if (explanationLevel === "easy") return "쉽게 풀이";
    if (explanationLevel === "exam") return "시험답안식 풀이";
    return "기본 해설";
  }, [explanationLevel]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "문제 풀이를 생성하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <h1 className="text-2xl font-semibold">문제 스냅 풀이</h1>
      <p className="text-sm text-[color:var(--muted)]">사진으로 문제를 올리면 개념·공식·풀이 순서를 쉽게 정리합니다.</p>
      <form onSubmit={onSubmit} className="space-y-4 rounded-[var(--radius-md)] border p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">모드
            <select className="mt-1 w-full rounded border p-2" value={examMode} onChange={(e)=>setExamMode((e.target.value === "first" ? "first" : "second"))}>
              <option value="second">2차</option><option value="first">1차</option>
            </select>
          </label>
          <label className="text-sm">과목
            <input className="mt-1 w-full rounded border p-2" value={subject} onChange={(e)=>setSubject(e.target.value)} />
          </label>
          <label className="text-sm">해설 난이도
            <select className="mt-1 w-full rounded border p-2" value={explanationLevel} onChange={(e)=>setExplanationLevel(e.target.value as ExplanationLevel)}>
              <option value="easy">쉽게 풀이</option><option value="standard">기본 해설</option><option value="exam">시험답안식</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">문제 파일 (이미지/PDF)
          <input className="mt-1 w-full" type="file" accept="image/*,.pdf" capture="environment" multiple onChange={(e)=>setFiles(Array.from(e.target.files ?? []))} />
        </label>
        <label className="block text-sm">문제 텍스트 (선택)
          <textarea className="mt-1 w-full rounded border p-2" rows={6} value={problemText} onChange={(e)=>setProblemText(e.target.value)} />
        </label>
        <button disabled={loading} className="rounded bg-black px-4 py-2 text-white disabled:opacity-60">문제 풀이 흐름 만들기</button>
        <p className="text-xs text-[color:var(--muted)]">정답 확정이 아니라 학습 보조 풀이입니다. 필요한 경우 원문과 계산을 직접 확인해 주세요.</p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      {result ? (
        <section className="space-y-4 rounded-[var(--radius-md)] border p-4">
          <h2 className="text-lg font-semibold">결과</h2>
          <div><h3 className="font-medium">1. 이 문제는 무엇을 묻나요?</h3><p>{result.problemSummary}</p><p className="text-sm text-[color:var(--muted)]">요구 유형: {result.askType}</p></div>
          <div><h3 className="font-medium">2. 필요한 개념</h3><ul>{result.requiredConcepts.map((x)=><li key={x}>• {x}</li>)}</ul></div>
          <div><h3 className="font-medium">3. 공식</h3><ul>{result.formulas.map((x)=><li key={x}>• {x}</li>)}</ul></div>
          <div><h3 className="font-medium">4. {resultHeading}</h3><p>{result.easyExplanation}</p></div>
          <div><h3 className="font-medium">5. 풀이 순서</h3><ol>{result.stepByStepSolution.map((x)=><li key={x}>{x}</li>)}</ol></div>
          <div><h3 className="font-medium">6. 자주 틀리는 포인트</h3><ul>{result.commonMistakes.map((x)=><li key={x}>• {x}</li>)}</ul></div>
          <div><h3 className="font-medium">7. 다음 연습 행동</h3><p>{result.nextPracticeAction}</p></div>
          <div><h3 className="font-medium">시험답안식 구조</h3><ul>{result.examStyleStructure.map((x)=><li key={x}>• {x}</li>)}</ul></div>
          <p className="text-xs text-[color:var(--muted)]">{result.caution}</p>
          <button disabled className="rounded border px-4 py-2 text-sm text-[color:var(--muted)]">이 문제를 복습 큐에 저장</button>
          <p className="text-xs text-[color:var(--muted)]">로그인 후 저장 기능으로 연결 예정</p>
        </section>
      ) : null}
    </main>
  );
}
