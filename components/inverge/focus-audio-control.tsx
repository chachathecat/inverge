"use client";

import { Headphones, Volume2, X } from "lucide-react";

import { RefinedBadge } from "@/components/inverge/refined-primitives";
import { Button } from "@/components/ui/button";
import { useFocusAudio } from "@/hooks/use-focus-audio";
import { FOCUS_AUDIO_TRACKS } from "@/lib/inverge/focus-audio";
import { cn } from "@/lib/utils";

type FocusAudioControlProps = {
  className?: string;
};

function playbackLabel(state: ReturnType<typeof useFocusAudio>["playbackState"]) {
  if (state === "playing") return "재생 중";
  if (state === "waiting_for_interaction") return "입력 대기";
  if (state === "error") return "재생 확인 필요";
  return "꺼짐";
}

export function FocusAudioControl({ className }: FocusAudioControlProps) {
  const {
    isReady,
    panelOpen,
    setPanelOpen,
    track,
    settings,
    playbackState,
    toggleEnabled,
    selectTrack,
    setVolume,
    toggleLoop,
  } = useFocusAudio();

  return (
    <div className={cn("relative z-20 flex justify-end", className)}>
      <Button type="button" variant="outline" size="lg" onClick={() => setPanelOpen(!panelOpen)}>
        <Headphones className="mr-2 h-4 w-4" />
        집중 오디오
      </Button>

      {panelOpen ? (
        <section className="absolute right-0 top-[calc(100%+12px)] w-[320px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">집중 오디오</p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">실행 중일 때만 켜는 보조 기능입니다.</p>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded-full p-1 text-[color:var(--muted)] transition hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--foreground-strong)]"
              aria-label="집중 오디오 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-[var(--radius-md)] bg-[color:var(--surface-soft)] px-4 py-3">
            <div>
              <p className="text-caption text-[color:var(--muted)]">상태</p>
              <p className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">
                {isReady ? playbackLabel(playbackState) : "설정 불러오는 중"}
              </p>
            </div>
            <label className="inline-flex items-center gap-2">
              <span className="sr-only">집중 오디오 켜기</span>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) => toggleEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)]"
              />
              <span className="text-sm text-[color:var(--foreground-strong)]">사용</span>
            </label>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block space-y-2">
              <span className="text-caption font-medium text-[color:var(--muted)]">트랙</span>
              <select
                value={settings.selectedTrack}
                onChange={(event) => selectTrack(event.target.value as typeof settings.selectedTrack)}
                disabled={!settings.enabled}
                className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 text-sm text-[color:var(--foreground-strong)] outline-none focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {FOCUS_AUDIO_TRACKS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-caption text-[color:var(--muted)]">{track.description}</p>
            </label>

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-caption font-medium text-[color:var(--muted)]">
                <Volume2 className="h-4 w-4" />
                볼륨
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(settings.volume * 100)}
                onChange={(event) => setVolume(Number(event.target.value) / 100)}
                disabled={!settings.enabled}
                className="w-full accent-[color:var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <p className="text-caption text-[color:var(--muted)]">{Math.round(settings.volume * 100)}%</p>
            </label>

            <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[color:var(--foreground-strong)]">반복 재생</p>
                <p className="mt-1 text-caption text-[color:var(--muted)]">실행 중인 동안 같은 트랙을 이어서 재생합니다.</p>
              </div>
              <label className="inline-flex items-center gap-2">
                <span className="sr-only">반복 재생 켜기</span>
                <input
                  type="checkbox"
                  checked={settings.loop}
                  onChange={(event) => toggleLoop(event.target.checked)}
                  disabled={!settings.enabled}
                  className="h-4 w-4 rounded border-[var(--border)]"
                />
                <span className="text-sm text-[color:var(--foreground-strong)]">반복</span>
              </label>
            </div>

            {settings.enabled && playbackState === "waiting_for_interaction" ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
                <RefinedBadge>보조 안내</RefinedBadge>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted-strong)]">
                  브라우저 정책 때문에 처음 재생은 클릭이나 키 입력 뒤에 이어질 수 있습니다.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
