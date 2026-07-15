import { notFound } from "next/navigation";

import { StickyAction } from "@/components/learner";
import type { StickyActionMode, StickyActionState } from "@/components/learner";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "S232B.2 StickyAction acceptance",
  robots: { index: false, follow: false },
};

const modes: readonly StickyActionMode[] = ["Dock", "Inline"];
const states: readonly StickyActionState[] = ["Ready", "Saving", "Offline", "Disabled"];

function SyntheticStickyAction({ mode, state }: { mode: StickyActionMode; state: StickyActionState }) {
  const shared = {
    mode,
    label: "10분 문단 다시쓰기",
    status: "2분 전 저장됨",
    showStatus: true,
    testId: `sticky-action-${mode}-${state}`,
  } as const;

  switch (state) {
    case "Ready":
      return <StickyAction {...shared} state="Ready" href="#ready-action-target" />;
    case "Saving":
      return (
        <StickyAction
          {...shared}
          state="Saving"
          controllerEvidence={{ kind: "save-in-progress", saveInProgress: true }}
        />
      );
    case "Offline":
      return (
        <StickyAction
          {...shared}
          state="Offline"
          controllerEvidence={{ kind: "network-offline", isOnline: false }}
        />
      );
    case "Disabled":
      return (
        <StickyAction
          {...shared}
          state="Disabled"
          controllerEvidence={{
            kind: "action-disabled",
            disabled: true,
            reason: "합성 비활성 예시",
          }}
        />
      );
  }
}

export default function S232B2StickyActionAcceptancePage() {
  if (
    process.env.VERCEL_ENV !== "preview" &&
    process.env.NODE_ENV !== "development"
  ) {
    notFound();
  }

  return (
    <main
      className="mx-auto w-full max-w-[var(--layout-content-max)] space-y-10 px-[var(--layout-page-edge)] py-10"
      data-s232b2-sticky-action-acceptance
      data-private-learner-data="absent"
    >
      <header className="max-w-[var(--layout-reading-column)] space-y-3">
        <p className="v3-type-caption text-[var(--color-text-secondary)]">
          S232B.2 · SYNTHETIC ACCEPTANCE
        </p>
        <h1 className="v3-type-screen text-[var(--color-text-primary)]">
          Figma V3 고정 학습 행동
        </h1>
        <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">
          개인 데이터, 답안, OCR, 계정 정보 없이 Figma 기본 문구만 사용하는 Preview 전용 2×4 상태 매트릭스입니다.
        </p>
      </header>

      <div className="grid gap-10 xl:grid-cols-2">
        {modes.map((mode) => (
          <section key={mode} className="space-y-5" aria-labelledby={`sticky-action-mode-${mode}`}>
            <h2 id={`sticky-action-mode-${mode}`} className="v3-type-section text-[var(--color-text-primary)]">
              {mode}
            </h2>
            <div className="space-y-6">
              {states.map((state) => (
                <article key={state} className="space-y-2">
                  <h3 className="v3-type-label-strong text-[var(--color-text-secondary)]">{state}</h3>
                  <div
                    className={
                      mode === "Dock"
                        ? "-ml-5 w-screen max-w-[390px] sm:ml-0 sm:w-full"
                        : undefined
                    }
                  >
                    <SyntheticStickyAction mode={mode} state={state} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div id="ready-action-target" tabIndex={-1} className="sr-only">
        Ready 링크 키보드 도착 지점
      </div>
    </main>
  );
}
