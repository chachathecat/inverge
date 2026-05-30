"use client";

import { useState } from "react";
import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SecondGradingMode, SecondGradingResult } from "@/lib/evaluate/second-grading/types";
import { cn } from "@/lib/utils";

type SecondQuestionType = "auto" | "theory" | "law" | "practice";
type GradeSecondResponse =
  | { ok: true; mode: SecondGradingMode; result: SecondGradingResult }
  | { ok: false; error: string };

type OcrFieldKey = "question" | "answer" | "reference";

export default function SecondGradingClient() {
  const [subject, setSubject] = useState("감정평가실무");
  const [questionType, setQuestionType] = useState<SecondQuestionType>("auto");
  const [questionText, setQuestionText] = useState("");
  const [userAnswerText, setUserAnswerText] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SecondGradingResult | null>(null);
  const [gradingMode, setGradingMode] = useState<SecondGradingMode | null>(null);
  const [ocrErrors, setOcrErrors] = useState<{ question?: string; answer?: string; reference?: string }>({});
  const [isOcrLoading, setIsOcrLoading] = useState<{ question: boolean; answer: boolean; reference: boolean }>({
    question: false,
    answer: false,
    reference: false,
  });
  const [ocrFiles, setOcrFiles] = useState<Record<OcrFieldKey, File[]>>({ question: [], answer: [], reference: [] });

  const mergeOcrText = (
    field: OcrFieldKey,
    incoming: string,
    pageNumber: number,
    modeType: "replace" | "append",
  ) => {
    const marker = `[OCR page ${pageNumber}]`;
    const chunk = `${marker}\n${incoming.trim()}`;
    const joiner = "\n\n";
    if (field === "question") {
      setQuestionText((prev) => (modeType === "replace" ? chunk : `${prev.trim()}${joiner}${chunk}`.trim()));
    }
    if (field === "answer") {
      setUserAnswerText((prev) => (modeType === "replace" ? chunk : `${prev.trim()}${joiner}${chunk}`.trim()));
    }
    if (field === "reference") {
      setReferenceText((prev) => (modeType === "replace" ? chunk : `${prev.trim()}${joiner}${chunk}`.trim()));
    }
  };

  const runOcrQueue = async (field: OcrFieldKey) => {
    const files = ocrFiles[field];
    if (!files.length) return;
    setOcrErrors((prev) => ({ ...prev, [field]: undefined }));

    const currentValue = field === "question" ? questionText : field === "answer" ? userAnswerText : referenceText;
    const hasExistingText = currentValue.trim().length > 0;
    const shouldAppend = hasExistingText
      ? window.confirm("기존 편집 텍스트가 있습니다. OCR 결과를 기존 텍스트 뒤에 이어붙일까요?\n취소를 누르면 기존 내용을 지우고 OCR 결과로 교체합니다.")
      : true;
    const writeMode: "replace" | "append" = shouldAppend ? "append" : "replace";

    if (writeMode === "replace") {
      if (field === "question") setQuestionText("");
      if (field === "answer") setUserAnswerText("");
      if (field === "reference") setReferenceText("");
    }

    setIsOcrLoading((prev) => ({ ...prev, [field]: true }));
    try {
      for (const [index, file] of files.entries()) {
        const formData = new FormData();
        formData.set("file", file);
        const response = await fetch("/api/instructor/second-grading/ocr", { method: "POST", body: formData });
        const payload = (await response.json()) as { ok: boolean; text?: string; error?: string };
        if (!response.ok || !payload.ok || !payload.text) {
          throw new Error(payload.error ?? `OCR ${index + 1}페이지 결과를 불러오지 못했습니다.`);
        }
        mergeOcrText(field, payload.text, index + 1, writeMode);
      }
      setOcrFiles((prev) => ({ ...prev, [field]: [] }));
    } catch (e) {
      setOcrErrors((prev) => ({ ...prev, [field]: e instanceof Error ? e.message : "OCR 요청 중 오류가 발생했습니다." }));
    } finally {
      setIsOcrLoading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const addFiles = (field: OcrFieldKey, incoming: FileList | null) => {
    if (!incoming?.length) return;
    const files = Array.from(incoming);
    setOcrFiles((prev) => ({ ...prev, [field]: [...prev[field], ...files] }));
  };

  const removeFile = (field: OcrFieldKey, index: number) => {
    setOcrFiles((prev) => ({ ...prev, [field]: prev[field].filter((_, itemIndex) => itemIndex !== index) }));
  };

  const moveFile = (field: OcrFieldKey, from: number, to: number) => {
    setOcrFiles((prev) => {
      const queue = [...prev[field]];
      const [file] = queue.splice(from, 1);
      queue.splice(to, 0, file);
      return { ...prev, [field]: queue };
    });
  };

  const runSecondGrading = async () => {
    setIsGrading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/answer-review/grade-second", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, questionType, questionText, userAnswerText, referenceText }),
      });
      const payload = (await response.json()) as GradeSecondResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "2차 채점 결과를 불러오지 못했습니다." : payload.error);
      }
      setGradingMode(payload.mode);
      setResult(payload.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "2차 채점 요청 중 오류가 발생했습니다.");
    } finally {
      setIsGrading(false);
    }
  };

  const OcrField = ({ label, field, value, onChange }: { label: string; field: OcrFieldKey; value: string; onChange: (value: string) => void }) => (
    <div className="space-y-2">
      <p className="text-caption font-medium text-[color:var(--muted)]">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-caption text-[color:var(--muted)]">
          사진/PDF 선택 (다중)
          <input
            className="mt-1 block w-full text-xs"
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={(e) => {
              addFiles(field, e.target.files);
              e.currentTarget.value = "";
            }}
          />
        </label>
        <label className="text-caption text-[color:var(--muted)]">
          카메라로 촬영(선택)
          <input
            className="mt-1 block w-full text-xs"
            type="file"
            multiple
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              addFiles(field, e.target.files);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] p-3">
        <p className="text-caption text-[color:var(--muted)]">페이지 순서 확인 필요</p>
        {!ocrFiles[field].length ? <p className="text-caption text-[color:var(--muted)]">대기 중인 페이지가 없습니다.</p> : null}
        <ul className="space-y-2">
          {ocrFiles[field].map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex flex-wrap items-center gap-2 text-caption">
              <span className="min-w-[80px] rounded bg-[color:var(--surface-subtle)] px-2 py-1">{index + 1}페이지</span>
              <span className="flex-1 break-all">{file.name}</span>
              <button type="button" className={cn(buttonVariants({ variant: "outline" }), "h-7 px-2 text-xs")} onClick={() => moveFile(field, index, index - 1)} disabled={index === 0}>↑</button>
              <button type="button" className={cn(buttonVariants({ variant: "outline" }), "h-7 px-2 text-xs")} onClick={() => moveFile(field, index, index + 1)} disabled={index === ocrFiles[field].length - 1}>↓</button>
              <button type="button" className={cn(buttonVariants({ variant: "outline" }), "h-7 px-2 text-xs")} onClick={() => removeFile(field, index)}>제거</button>
            </li>
          ))}
        </ul>
        <button type="button" className={cn(buttonVariants({ variant: "default" }), "mt-3 w-full sm:w-auto")} onClick={() => void runOcrQueue(field)} disabled={isOcrLoading[field] || !ocrFiles[field].length}>
          {isOcrLoading[field] ? "OCR 처리 중..." : "선택한 페이지 OCR 실행"}
        </button>
      </article>
      <Textarea className="min-h-[140px]" value={value} onChange={(e) => onChange(e.target.value)} />
      {ocrErrors[field] ? <p className="text-caption text-[#8a4b2f]">{ocrErrors[field]}</p> : null}
    </div>
  );

  return (
    <RefinedShell className="space-y-4 py-6 sm:py-10">
      <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <RefinedBadge>학원용 답안 운영 콘솔</RefinedBadge>
          <RefinedBadge tone="amber">강사/첨삭자용 채점 초안</RefinedBadge>
        </div>
        <p className="text-caption leading-5 text-[color:var(--muted)]">최종 판단 전 강사 검수 필수 · 공식 점수 아님 · 공식 모범답안 아님 · 훈련/진단용 결과</p>
        <p className="text-caption leading-5 text-[color:var(--muted)]">OCR 결과는 초안입니다. 채점 전 반드시 원문과 대조해 주세요.</p>
        <p className="text-caption leading-5 text-[color:var(--muted)]">계산식, 단위, 문제번호는 OCR 오류가 잦으므로 직접 확인해 주세요.</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-caption font-medium text-[color:var(--muted)]">
            과목
            <select className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option>감정평가실무</option>
              <option>감정평가이론</option>
              <option>감정평가 및 보상법규</option>
            </select>
          </label>
          <label className="space-y-2 text-caption font-medium text-[color:var(--muted)]">
            문제 유형
            <select className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm" value={questionType} onChange={(e) => setQuestionType(e.target.value as SecondQuestionType)}>
              <option value="auto">자동분류</option>
              <option value="theory">이론형</option>
              <option value="law">법규형</option>
              <option value="practice">실무형</option>
            </select>
          </label>
        </div>

        <OcrField label="문제" field="question" value={questionText} onChange={setQuestionText} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <OcrField label="수험생 답안 (선택)" field="answer" value={userAnswerText} onChange={setUserAnswerText} />
            <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-subtle)] p-3 text-caption text-[color:var(--muted)]">
              <p className="font-medium">OCR/채점 전 확인 체크리스트</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>문제번호 확인</li>
                <li>계산식 확인</li>
                <li>단위 확인</li>
                <li>페이지 순서 확인</li>
                <li>“끝” / “이하여백” 여부 확인</li>
              </ul>
            </article>
          </div>
          <OcrField label="기준답안/참고자료 (선택)" field="reference" value={referenceText} onChange={setReferenceText} />
        </div>

        <button type="button" onClick={() => void runSecondGrading()} className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-auto")} disabled={isGrading}>
          {isGrading ? "채점 중..." : "2차 채점 실행"}
        </button>

        {error ? <article className="rounded-[var(--radius-sm)] border border-[#b9a98a] bg-[#f8f4ea] px-4 py-3 text-caption text-[#5a4b32]">{error}</article> : null}
        {result ? (
          <div className="space-y-3">
            {gradingMode ? <p className="text-caption text-[color:var(--muted)]">초안 모드: {gradingMode === "grade_answer" ? "답안 채점 초안" : "문제 분석 초안"}</p> : null}
            <article className="rounded-[var(--radius-sm)] border border-[var(--border)] p-3">
              <p className="font-medium">Ⅰ. 논점 게이트 판정</p>
              <p className="text-caption">{result.issueGate?.reason}</p>
            </article>
            <article className="rounded-[var(--radius-sm)] border border-[var(--border)] p-3">
              <p className="font-medium">Ⅱ. 문제 유형 및 동적 가중치</p>
              <p className="text-caption">{result.questionType} · {result.subject}</p>
            </article>
          </div>
        ) : null}
      </section>
    </RefinedShell>
  );
}
