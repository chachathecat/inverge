"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { WrongAnswerCaptureForm } from "@/components/review-os/capture-form";
import { Button } from "@/components/ui/button";

const SECOND_WRITE_FORM_ID = "second-write-capture-form";

type SecondWriteCaptureFormProps = {
  userId: string;
  initialPreferredSubjects?: string[];
};

export function SecondWriteCaptureForm({
  userId,
  initialPreferredSubjects,
}: SecondWriteCaptureFormProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [formAvailable, setFormAvailable] = useState(false);
  const [finalConfirmationReady, setFinalConfirmationReady] = useState(false);

  const syncFormState = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;

    const form = root.querySelector("form");
    if (form) {
      form.id = SECOND_WRITE_FORM_ID;
      setFormAvailable(true);
    } else {
      setFormAvailable(false);
      setFinalConfirmationReady(false);
    }

    if (root.querySelector('[data-testid="capture-save-confirmation"]')) {
      setFinalConfirmationReady(false);
    }
  }, []);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    syncFormState();
    const observer = new MutationObserver(syncFormState);
    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [syncFormState]);

  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest("button");
    if (button?.textContent?.trim() !== "마지막 확인으로 이동") return;

    window.setTimeout(() => {
      const root = containerRef.current;
      const form = root?.querySelector("form");
      if (!root || !form) return;

      form.id = SECOND_WRITE_FORM_ID;
      const stillEditingFinalParagraph = Boolean(
        root.querySelector('[data-testid="second-write-final-textarea"]'),
      );
      const alreadySaved = Boolean(
        root.querySelector('[data-testid="capture-save-confirmation"]'),
      );

      if (!stillEditingFinalParagraph && !alreadySaved) {
        setFormAvailable(true);
        setFinalConfirmationReady(true);
      }
    }, 0);
  }

  return (
    <div ref={containerRef} onClickCapture={handleClickCapture}>
      <WrongAnswerCaptureForm
        userId={userId}
        mode="second"
        workflow="second-write"
        initialPreferredSubjects={initialPreferredSubjects}
      />

      {finalConfirmationReady && formAvailable ? (
        <section
          className="mt-5 rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5 sm:p-6"
          data-testid="second-write-final-confirmation"
          aria-live="polite"
        >
          <p className="text-caption text-[color:var(--brand-700)]">마지막 확인</p>
          <h3 className="mt-2 text-title text-[color:var(--foreground-strong)]">
            작성한 흐름을 학습 기록으로 저장합니다.
          </h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            쟁점 회상, 목차, 내 답안, 비교, 가장 큰 약점과 다시 쓴 문단을 확인한 뒤 저장하세요.
          </p>
          <Button
            type="submit"
            form={SECOND_WRITE_FORM_ID}
            data-testid="second-write-final-save"
            className="mt-5 w-full sm:w-auto"
          >
            저장하고 오늘 할 일에 반영
          </Button>
        </section>
      ) : null}
    </div>
  );
}
