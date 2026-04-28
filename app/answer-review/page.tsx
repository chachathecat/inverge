"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";

import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const flowCards = [
  {
    title: "1) 문제 맥락 입력",
    description: "문제/사례를 먼저 입력해 답안 검토의 기준 맥락을 고정합니다.",
  },
  {
    title: "2) 내 답안 입력",
    description: "답안 이미지를 올리거나 텍스트를 붙여 넣어 검토할 원문을 준비합니다.",
  },
  {
    title: "3) 기준답안 입력",
    description: "기준답안/기준목차를 텍스트로 붙여 넣고 누락 논점을 수동으로 점검합니다.",
  },
  {
    title: "4) 교정 실행",
    description: "누락 논점 후보와 교정 문단을 작성해 다음 답안 재작성으로 이어집니다.",
  },
];

type InputStatusCardProps = {
  title: string;
  isFilled: boolean;
  helper: string;
};

function InputStatusCard({ title, isFilled, helper }: InputStatusCardProps) {
  return (
    <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] p-3">
      <p className="text-caption font-medium text-[color:var(--muted)]">{title}</p>
      <p className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">{isFilled ? "입력됨" : "미입력"}</p>
      <p className="mt-1 text-caption text-[color:var(--muted)]">{helper}</p>
    </article>
  );
}

export default function AnswerReviewInfoPage() {
  const [problemFileName, setProblemFileName] = useState<string | null>(null);
  const [myAnswerFileName, setMyAnswerFileName] = useState<string | null>(null);
  const [problemText, setProblemText] = useState("");
  const [myAnswerText, setMyAnswerText] = useState("");
  const [referenceAnswerText, setReferenceAnswerText] = useState("");
  const [missingPointMemo, setMissingPointMemo] = useState("");
  const [revisionParagraph, setRevisionParagraph] = useState("");

  const handleProblemFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setProblemFileName(file ? file.name : null);
  };

  const handleMyAnswerFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setMyAnswerFileName(file ? file.name : null);
  };

  const hasProblemInput = problemText.trim().length > 0 || Boolean(problemFileName);
  const hasMyAnswer = myAnswerText.trim().length > 0 || Boolean(myAnswerFileName);
  const hasReferenceAnswer = referenceAnswerText.trim().length > 0;
  const isReviewReady = hasProblemInput && hasMyAnswer && hasReferenceAnswer;

  const primaryCtaLabel = useMemo(() => {
    if (isReviewReady) return "검토 preview 확인";
    return "답안 이미지 업로드";
  }, [isReviewReady]);

  const getParagraphCount = (text: string) => {
    const normalized = text.trim();
    if (!normalized) return 0;
    return normalized
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean).length;
  };

  const jumpToSection = () => {
    const targetId = isReviewReady ? "manual-comparison-preview" : "my-answer-upload";
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <RefinedShell className="space-y-5 py-6 sm:space-y-8 sm:py-10">
      <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <RefinedBadge>운영자용 베타</RefinedBadge>
          <RefinedBadge tone="amber">강사 검수 전 확정 금지</RefinedBadge>
        </div>

        <section className="space-y-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4 sm:p-5">
          <div className="space-y-3">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">검토 준비 상태</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <InputStatusCard title="문제/사례" isFilled={hasProblemInput} helper="문제 이미지 또는 텍스트" />
              <InputStatusCard title="내 답안" isFilled={hasMyAnswer} helper="답안 이미지 또는 텍스트" />
              <InputStatusCard title="기준답안" isFilled={hasReferenceAnswer} helper="기준답안/기준목차 텍스트" />
            </div>
            <button type="button" className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-auto")} onClick={jumpToSection}>
              {primaryCtaLabel}
            </button>
            <p className="text-caption text-[color:var(--muted)]">
              {isReviewReady
                ? "세 입력이 모두 준비되었습니다. 아래 수동 검토 preview에서 상태를 확인하세요."
                : "문제 요구와 기준답안을 함께 넣어야 답안의 빠진 부분을 안전하게 볼 수 있습니다."}
            </p>
          </div>

          <div className="space-y-2">
            <h1 className="text-[26px] font-medium leading-[1.2] tracking-[-0.03em] text-[color:var(--foreground-strong)] sm:text-[34px]">
              문제/사례 + 내 답안 + 기준답안을 함께 입력해 수동 검토 preview로 이어갑니다.
            </h1>
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              최종 채점이나 합격 판정이 아니라 답안 검토와 보강을 돕는 운영형 흐름입니다.
            </p>
          </div>

          <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[color:var(--surface)] p-3 text-caption text-[color:var(--muted)]">
            OCR 결과는 초안이며 저장 전 확인이 필요합니다. 기준답안은 텍스트 붙여넣기 중심으로 입력해 주세요.
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <section className="space-y-3" id="problem-upload">
              <p className="text-caption font-medium text-[color:var(--muted)]">문제/사례 이미지 업로드 (OCR 초안용)</p>
              <label
                htmlFor="answer-review-problem-file-upload"
                className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer justify-center w-full sm:w-auto")}
              >
                문제/사례 이미지 선택
              </label>
              <input
                id="answer-review-problem-file-upload"
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleProblemFileChange}
              />
              <p className="text-caption text-[color:var(--muted)]">
                파일: <span className="font-medium text-[color:var(--foreground-strong)]">{problemFileName ?? "선택된 파일이 없습니다."}</span>
              </p>
            </section>

            <section className="space-y-3" id="my-answer-upload">
              <p className="text-caption font-medium text-[color:var(--muted)]">내 답안 이미지 업로드 (OCR 초안용)</p>
              <label
                htmlFor="answer-review-my-answer-file-upload"
                className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer justify-center w-full sm:w-auto")}
              >
                내 답안 이미지 선택
              </label>
              <input
                id="answer-review-my-answer-file-upload"
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleMyAnswerFileChange}
              />
              <p className="text-caption text-[color:var(--muted)]">
                파일: <span className="font-medium text-[color:var(--foreground-strong)]">{myAnswerFileName ?? "선택된 파일이 없습니다."}</span>
              </p>
            </section>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="space-y-2" id="answer-review-problem">
              <p className="text-caption font-medium text-[color:var(--muted)]">문제/사례 입력</p>
              <Textarea
                className="min-h-[160px] bg-[color:var(--surface)]"
                placeholder="문제 요구사항, 사례 조건, 논점 키워드를 입력해 주세요."
                value={problemText}
                onChange={(event) => setProblemText(event.target.value)}
              />
            </div>
            <div className="space-y-2" id="answer-review-text">
              <p className="text-caption font-medium text-[color:var(--muted)]">내 답안 입력</p>
              <Textarea
                className="min-h-[160px] bg-[color:var(--surface)]"
                placeholder="OCR 초안(있는 경우)을 붙여 넣거나 직접 입력해 주세요."
                value={myAnswerText}
                onChange={(event) => setMyAnswerText(event.target.value)}
              />
            </div>
            <div className="space-y-2" id="answer-review-reference">
              <p className="text-caption font-medium text-[color:var(--muted)]">기준답안/기준목차 입력</p>
              <Textarea
                className="min-h-[160px] bg-[color:var(--surface)]"
                placeholder="기준답안 또는 기준목차를 텍스트로 붙여 넣어 주세요."
                value={referenceAnswerText}
                onChange={(event) => setReferenceAnswerText(event.target.value)}
              />
            </div>
          </div>

          <section id="manual-comparison-preview" className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">Manual comparison preview</p>
            <ul className="space-y-2 text-caption text-[color:var(--muted)]">
              <li>
                문제/사례: <span className="font-medium text-[color:var(--foreground-strong)]">{hasProblemInput ? "입력됨" : "미입력"}</span>
              </li>
              <li>
                내 답안: <span className="font-medium text-[color:var(--foreground-strong)]">{hasMyAnswer ? "입력됨" : "미입력"}</span>
              </li>
              <li>
                기준답안: <span className="font-medium text-[color:var(--foreground-strong)]">{hasReferenceAnswer ? "입력됨" : "미입력"}</span>
              </li>
              <li>
                준비 상태:{" "}
                <span className="font-medium text-[color:var(--foreground-strong)]">
                  {isReviewReady ? "검토 준비 완료" : "세 입력을 모두 준비하면 검토 준비 완료로 전환됩니다."}
                </span>
              </li>
            </ul>
            {isReviewReady ? (
              <p className="text-caption text-[color:var(--muted)]">
                입력 요약: 내 답안 {myAnswerText.trim().length}자/{getParagraphCount(myAnswerText)}문단, 기준답안 {referenceAnswerText.trim().length}자/
                {getParagraphCount(referenceAnswerText)}문단.
              </p>
            ) : null}
          </section>

          <section className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">수동 검토 메모</p>
            <div className="space-y-2">
              <p className="text-caption font-medium text-[color:var(--muted)]">누락 논점 후보</p>
              <Textarea
                className="min-h-[96px] bg-[color:var(--surface)]"
                placeholder="예: 처분 근거 조문 제시가 누락되어 논증 연결이 약함"
                value={missingPointMemo}
                onChange={(event) => setMissingPointMemo(event.target.value)}
              />
              <p className="text-caption text-[color:var(--muted)]">자동 산출이 아니라 운영자/검토자가 직접 적는 메모입니다.</p>
            </div>
            <div className="space-y-2">
              <p className="text-caption font-medium text-[color:var(--muted)]">교정 문단</p>
              <Textarea
                className="min-h-[120px] bg-[color:var(--surface)]"
                placeholder="누락 논점을 반영해 보강 문단을 직접 작성해 주세요."
                value={revisionParagraph}
                onChange={(event) => setRevisionParagraph(event.target.value)}
              />
              <p className="text-caption text-[color:var(--muted)]">자동 생성이 아니라 운영자/검토자가 직접 적는 교정 초안입니다.</p>
            </div>
            <p className="text-caption text-[color:var(--muted)]">현재 화면에서만 확인하는 초안입니다. 저장 완료처럼 표시되지 않습니다.</p>
          </section>
        </section>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {flowCards.map((card) => (
          <article key={card.title} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{card.title}</p>
            <p className="mt-2 text-caption leading-6 text-[color:var(--muted)]">{card.description}</p>
          </article>
        ))}
      </section>

      <div>
        <Link href="/exams" className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
          시험 선택으로 돌아가기
        </Link>
      </div>
    </RefinedShell>
  );
}
