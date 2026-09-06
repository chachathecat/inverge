"use client";

import { useMemo, useRef, useState } from "react";

import { V3ActionButton, V3Surface } from "@/components/learner";
import {
  LEARNER_ENTRY_CHOICES,
  resolveLearnerEntryChoiceV1,
  type LearnerEntryChoice,
  type LearnerSupportProjectionV1,
} from "@/lib/core-blitz/learner-capability";

export function LearnerSupportPanel({
  itemId,
}: {
  itemId: string;
}) {
  const choices = useMemo(
    () =>
      LEARNER_ENTRY_CHOICES.map((choice) =>
        resolveLearnerEntryChoiceV1(choice),
      ),
    [],
  );
  const [projection, setProjection] =
    useState<LearnerSupportProjectionV1 | null>(null);
  const [pendingChoice, setPendingChoice] =
    useState<LearnerEntryChoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventIdsByChoice = useRef<
    Partial<Record<LearnerEntryChoice, string>>
  >({});

  async function selectChoice(choice: LearnerEntryChoice) {
    setError(null);
    setProjection(null);
    if (choice === "FULL_SOLUTION" || choice === "DIRECT_ANSWER") {
      setError("검증된 학습 참고가 연결되지 않아 이 선택을 열 수 없습니다.");
      return;
    }
    if (
      typeof crypto === "undefined" ||
      typeof crypto.randomUUID !== "function"
    ) {
      setError("도움 사용 기록을 만들 수 없어 내용을 열지 않았습니다.");
      return;
    }

    const eventId =
      eventIdsByChoice.current[choice] ?? crypto.randomUUID();
    eventIdsByChoice.current[choice] = eventId;
    setPendingChoice(choice);
    try {
      const response = await fetch("/api/os/learner-support", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          itemId,
          choice,
          surface: "STUDY_LEDGER_DETAIL",
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok: true;
            status: "saved" | "deduped";
            decision: { choice: LearnerEntryChoice };
            projection: LearnerSupportProjectionV1;
          }
        | { ok: false; error?: string }
        | null;
      if (
        !response.ok ||
        !payload?.ok ||
        payload.decision.choice !== choice ||
        payload.projection.choice !== choice
      ) {
        throw new Error("도움 사용 기록을 저장하지 못했습니다.");
      }
      delete eventIdsByChoice.current[choice];
      setProjection(payload.projection);
    } catch (selectionError) {
      setError(
        selectionError instanceof Error
          ? selectionError.message
          : "도움 사용 기록을 저장하지 못했습니다.",
      );
    } finally {
      setPendingChoice(null);
    }
  }

  return (
    <section
      className="space-y-5"
      aria-labelledby="core-blitz-learner-support-title"
      data-core-blitz-learner-support
    >
      <header className="space-y-2">
        <p className="v3-type-caption text-[var(--color-text-brand)]">
          학습 방식 선택
        </p>
        <h2
          id="core-blitz-learner-support-title"
          className="v3-type-section ko-keep text-[var(--color-text-primary)]"
        >
          지금 필요한 만큼만 도움을 여세요
        </h2>
        <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">
          도움을 본 같은 문제는 독립 숙달이나 전이 성공으로 계산하지 않습니다.
          정답과 전체풀이는 검증된 학습 참고가 연결된 경우에만 열립니다.
        </p>
        <p
          className="v3-type-caption text-[var(--color-text-secondary)]"
          id="core-blitz-reference-unavailable"
          data-reference-authority="NONE"
        >
          기준답안 권한: 검증된 학습 참고 미연결 · 정답/전체풀이 비활성
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="학습 방식">
        {choices.map((decision) => (
          <V3ActionButton
            key={decision.choice}
            type="button"
            tone={decision.choice === "TRY_FIRST" ? "primary" : "secondary"}
            onClick={() => void selectChoice(decision.choice)}
            disabled={
              pendingChoice !== null ||
              decision.choice === "FULL_SOLUTION" ||
              decision.choice === "DIRECT_ANSWER"
            }
            aria-describedby={
              decision.choice === "FULL_SOLUTION" ||
              decision.choice === "DIRECT_ANSWER"
                ? "core-blitz-reference-unavailable"
                : undefined
            }
            aria-pressed={projection?.choice === decision.choice}
            data-learner-entry-choice={decision.choice}
          >
            {pendingChoice === decision.choice ? "기록 중…" : decision.label}
          </V3ActionButton>
        ))}
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-[var(--v3-radius-control)] border border-[var(--color-border-risk)] bg-[var(--color-background-risk)] p-4"
        >
          <p className="v3-type-compact text-[var(--color-text-primary)]">
            {error} 내용은 아직 공개하지 않았습니다.
          </p>
        </div>
      ) : null}

      {projection ? (
        <V3Surface
          className="space-y-4"
          data-learner-support-projection={projection.choice}
          data-assistance-class={projection.assistanceClass}
        >
          <div className="space-y-1">
            <h3 className="v3-type-section ko-keep text-[var(--color-text-primary)]">
              {projection.title}
            </h3>
            <p className="v3-type-compact ko-keep text-[var(--color-text-secondary)]">
              {projection.notice}
            </p>
          </div>

          {projection.sections.map((section) => (
            <section
              key={section.heading}
              className="space-y-2 border-t border-[var(--color-border-default)] pt-4"
            >
              <h4 className="v3-type-label-strong text-[var(--color-text-primary)]">
                {section.heading}
              </h4>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li
                    key={`${section.heading}:${item}`}
                    className="v3-type-body ko-keep text-[var(--color-text-primary)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <dl className="grid gap-2 border-t border-[var(--color-border-default)] pt-4 sm:grid-cols-2">
            <div>
              <dt className="v3-type-caption text-[var(--color-text-secondary)]">
                도움 기록
              </dt>
              <dd className="v3-type-compact mt-1 text-[var(--color-text-primary)]">
                {projection.assistanceClass}
              </dd>
            </div>
            <div>
              <dt className="v3-type-caption text-[var(--color-text-secondary)]">
                다음 확인
              </dt>
              <dd className="v3-type-compact mt-1 text-[var(--color-text-primary)]">
                {projection.requiresDistinctUnaidedAttempt
                  ? "다른 시점에 무도움 수행 필요"
                  : "지금 직접 시도"}
              </dd>
            </div>
          </dl>
        </V3Surface>
      ) : null}
    </section>
  );
}
