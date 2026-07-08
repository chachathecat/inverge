"use client";

import { useMemo, useState } from "react";
import { Check, FileImage, Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type OcrAssistPanelProps = {
  title: string;
  description: string;
  applyLabel: string;
  directInputPlaceholder: string;
  reviewLabel?: string;
  helperText?: string;
  initialText?: string;
  onApply: (text: string, fileNames: string[]) => void;
};

type InputMode = "manual" | "photo";

type OcrResponse = {
  ok: boolean;
  text?: string;
  error?: string;
};

const APPLY_SUCCESS_MESSAGE = "현재 작업에 반영했습니다.";

export function OcrAssistPanel({
  title,
  description,
  applyLabel,
  directInputPlaceholder,
  reviewLabel = "불러온 텍스트 검토",
  helperText = "현재는 직접 입력한 텍스트가 안정 경로입니다. 사진 추출은 학습 보조 초안으로만 사용합니다.",
  initialText = "",
  onApply,
}: OcrAssistPanelProps) {
  const [mode, setMode] = useState<InputMode>("manual");
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<"idle" | "extracting" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");

  const canApply = text.trim().length > 0;
  const fileNames = useMemo(() => files.map((file) => file.name), [files]);

  function handleFileChange(nextFiles: FileList | null) {
    const selected = Array.from(nextFiles ?? []).slice(0, 3);
    setFiles(selected);
    setStatus("idle");
    setMessage(selected.length ? `${selected.length}개 파일을 불러왔습니다.` : "");
  }

  async function handleExtract() {
    if (files.length === 0) {
      setStatus("error");
      setMessage("먼저 사진 파일을 선택해 주세요.");
      return;
    }

    setStatus("extracting");
    setMessage("");

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));

      const response = await fetch("/api/inverge/ocr", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as OcrResponse;
      if (!response.ok || !result.ok || !result.text) {
        throw new Error(result.error ?? "텍스트를 불러오지 못했습니다.");
      }

      setText(result.text);
      setStatus("ready");
      setMessage("텍스트를 불러왔습니다. 필요한 부분을 검토하고 바로 수정해 주세요.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "텍스트를 불러오지 못했습니다.");
    }
  }

  function handleApply() {
    if (!canApply) return;
    onApply(text.trim(), fileNames);
    setMessage(APPLY_SUCCESS_MESSAGE);
    setStatus("ready");
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{title}</p>
          <p className="mt-1 text-caption text-[color:var(--muted)]">{description}</p>
        </div>
        <div className="inline-flex rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] p-1">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={cn(
              "rounded-full px-3 py-1.5 text-caption transition",
              mode === "manual" ? "bg-[color:var(--primary)] text-white" : "text-[color:var(--muted)]",
            )}
          >
            직접 입력하기
          </button>
          <button
            type="button"
            onClick={() => setMode("photo")}
            className={cn(
              "rounded-full px-3 py-1.5 text-caption transition",
              mode === "photo" ? "bg-[color:var(--primary)] text-white" : "text-[color:var(--muted)]",
            )}
          >
            사진 실험
          </button>
        </div>
      </div>

      {mode === "photo" ? (
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer flex-col gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[color:var(--surface-soft)] px-4 py-4">
            <div className="flex items-center gap-2 text-sm text-[color:var(--foreground-strong)]">
              <FileImage className="h-4 w-4" />
              답안 또는 문제 사진을 선택해 주세요. 결과는 직접 확인해야 합니다.
            </div>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => handleFileChange(event.target.files)} />
            <span className="inline-flex w-fit items-center rounded-full border border-[var(--border)] px-3 py-1.5 text-caption text-[color:var(--muted-strong)]">
              <UploadCloud className="mr-2 h-4 w-4" />
              사진 선택
            </span>
            {fileNames.length ? (
              <ul className="space-y-1 text-caption text-[color:var(--muted)]">
                {fileNames.map((fileName) => (
                  <li key={fileName}>{fileName}</li>
                ))}
              </ul>
            ) : null}
          </label>

          <Button type="button" variant="outline" onClick={() => void handleExtract()} disabled={status === "extracting"}>
            {status === "extracting" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                텍스트를 불러오는 중
              </>
            ) : (
              "사진에서 텍스트 불러오기"
            )}
          </Button>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <p className="text-caption font-medium text-[color:var(--muted)]">{mode === "manual" ? "입력 내용 검토" : reviewLabel}</p>
        <Textarea value={text} onChange={(event) => setText(event.target.value)} className="min-h-[132px]" placeholder={directInputPlaceholder} />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-[color:var(--muted)]">{helperText}</p>
        <Button type="button" onClick={handleApply} disabled={!canApply}>
          {status === "ready" && message === APPLY_SUCCESS_MESSAGE ? <Check className="mr-2 h-4 w-4" /> : null}
          {applyLabel}
        </Button>
      </div>

      {message ? (
        <p className={cn("mt-3 text-caption", status === "error" ? "text-[color:var(--status-red)]" : "text-[color:var(--muted)]")}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
