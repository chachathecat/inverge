"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { FileImage, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { DashboardBento } from "@/components/dashboard/bento-grid";
import { ScoreBarChart } from "@/components/charts/score-bar-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useEvaluation } from "@/hooks/use-evaluation";
import type { EvaluationHistoryPoint } from "@/types/evaluation";

function buildHistory(totalScore: number): EvaluationHistoryPoint[] {
  return [
    { exam_date: "모의-1", total_score: Math.max(35, totalScore - 16) },
    { exam_date: "모의-2", total_score: Math.max(40, totalScore - 11) },
    { exam_date: "모의-3", total_score: Math.max(45, totalScore - 7) },
    { exam_date: "최근", total_score: totalScore || 52 },
  ];
}

function ResultSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-36 rounded-2xl bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-2xl bg-slate-200" />
        <div className="h-24 rounded-2xl bg-slate-200" />
        <div className="h-24 rounded-2xl bg-slate-200" />
      </div>
      <div className="h-24 rounded-2xl bg-slate-200" />
    </div>
  );
}

export function EvaluationPanel() {
  const [answer, setAnswer] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const { evaluate, isLoading, result, error, transcription } = useEvaluation();

  const history = useMemo(() => buildHistory(result?.total_score ?? 0), [result]);

  const triggerAnalysis = useCallback(
    async (files: File[], text: string) => {
      await evaluate({ answer: text, images: files });
    },
    [evaluate],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const nextFiles = acceptedFiles.slice(0, 3);
      setUploadedFiles(nextFiles);
      await triggerAnalysis(nextFiles, answer);
    },
    [answer, triggerAnalysis],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 3,
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await triggerAnalysis(uploadedFiles, answer);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 lg:col-span-7">
        <Card>
          <CardHeader>
            <CardTitle>답안 입력 및 업로드</CardTitle>
            <CardDescription>
              텍스트 입력을 안정 경로로 사용합니다. 사진 업로드는 보조 추출 후 직접 확인이 필요합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <Textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="답안을 입력하세요."
              />

              <div
                {...getRootProps()}
                className={`rounded-2xl border border-dashed p-4 transition ${
                  isDragActive
                    ? "border-emerald-700 bg-emerald-50"
                    : "border-slate-300 bg-slate-50/70"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <FileImage className="h-4 w-4" />
                    {isDragActive
                      ? "파일을 여기에 놓으면 보조 추출을 시도합니다"
                      : "답안 이미지는 보조 추출용으로만 업로드"}
                  </div>
                  <Button type="button" variant="outline" onClick={open} className="w-full sm:w-auto">
                    <UploadCloud className="mr-2 h-4 w-4" /> 사진 보조 업로드
                  </Button>
                </div>
                {uploadedFiles.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-slate-500">
                    {uploadedFiles.map((file) => (
                      <li key={file.name}>{file.name}</li>
                    ))}
                  </ul>
                )}
              </div>

              <Button type="submit" size="lg" disabled={isLoading || (!answer.trim() && uploadedFiles.length === 0)}>
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> 검토 중...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> 검토 실행
                  </span>
                )}
              </Button>

              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  분석에 실패했습니다. {error}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <DashboardBento result={result} history={history} />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-6 lg:col-span-5"
      >
        <Card>
          <CardHeader>
            <CardTitle>검토 결과</CardTitle>
            <CardDescription>모든 수치는 답안 점검을 돕는 참고 신호로만 사용됩니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ResultSkeleton />
            ) : (
              <>
                <div className="rounded-2xl bg-[#064E3B] px-5 py-6 text-white">
                  <p className="text-xs text-emerald-100">Relative Position Score</p>
                  <p className="mt-2 text-5xl font-semibold">
                    {result ? result.total_score : "-"}
                    <span className="text-2xl text-emerald-100">/100</span>
                  </p>
                  <p className="mt-3 text-sm text-emerald-100">
                    {result
                      ? `현재 상위 ${Math.max(5, Math.min(95, Math.round(100 - result.total_score * 0.7)))}% 수준입니다.`
                      : "답안을 제출하면 상대 위치 분석이 표시됩니다."}
                  </p>
                </div>

                {result && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">구조</p>
                      <p className="text-2xl font-semibold text-slate-900">{result.structure_score}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">내용</p>
                      <p className="text-2xl font-semibold text-slate-900">{result.content_score}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">표현</p>
                      <p className="text-2xl font-semibold text-slate-900">{result.expression_score}</p>
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  {result ? (
                    <ScoreBarChart result={result} />
                  ) : (
                    <p className="text-sm text-slate-500">분석 후 세부 점수 그래프가 표시됩니다.</p>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(result?.weaknesses ?? ["분석 대기", "분석 대기", "분석 대기"]).map((item, index) => (
                    <Badge key={`${item}-${index}`}>{item}</Badge>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">다음 행동</p>
                  <p className="mt-2 text-sm text-emerald-950">
                    {result?.next_action ?? "분석 완료 후 다음 행동이 표시됩니다."}
                  </p>
                </div>

                {transcription && uploadedFiles.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">보조 추출 텍스트</p>
                    <p className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap text-xs text-slate-700">
                      {transcription}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}
