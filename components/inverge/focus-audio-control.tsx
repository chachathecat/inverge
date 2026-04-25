"use client";

import { Headphones, Volume2 } from "lucide-react";

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
  return "끄기";
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
      <Button
        type="button"
        variant="outline"
        onClick={() => setPanelOpen(!panelOpen)}
        className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm"
      >
        <Headphones className="mr-1 h-3.5 w-3.5 sm:mr-1.5 sm:h-4 sm:w-4" />
        집중음
      </Button>

      {panelOpen ? (
        <section className="absolute right-0 top-[calc(100%+8px)] w-[min(272px,calc(100vw-24px))] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-3.5 shadow-[var(--shadow-soft)] sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">집중음</p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">필요할 때만 조용히 켭니다.</p>
            </div>
            <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setPanelOpen(false)}>
              닫기
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[color:var(--surface-soft)] px-3 py-2.5">
            <div>
              <p className="text-caption text-[color:var(--muted)]">상태</p>
              <p className="mt-0.5 text-sm font-medium text-[color:var(--foreground-strong)]">
                {isReady ? playbackLabel(playbackState) : "설정 불러오는 중"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                className="h-8 px-3 text-xs"
                variant={settings.enabled ? "default" : "outline"}
                onClick={() => toggleEnabled(true)}
              >
                켜기
              </Button>
              <Button type="button" className="h-8 px-3 text-xs" variant="outline" onClick={() => toggleEnabled(false)}>
                끄기
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block space-y-1.5">
              <span className="text-caption font-medium text-[color:var(--muted)]">트랙</span>
              <select
                value={settings.selectedTrack}
                onChange={(event) => selectTrack(event.target.value as typeof settings.selectedTrack)}
                disabled={!settings.enabled}
                className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-2.5 text-sm text-[color:var(--foreground-strong)] outline-none focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {FOCUS_AUDIO_TRACKS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-caption text-[color:var(--muted)]">{track.description}</p>
            </label>

            <label className="block space-y-1.5">
              <span className="flex items-center gap-2 text-caption font-medium text-[color:var(--muted)]">
                <Volume2 className="h-4 w-4" />
                낮은 소리
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

            <label className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2">
              <span className="text-caption text-[color:var(--muted)]">반복</span>
              <input
                type="checkbox"
                checked={settings.loop}
                onChange={(event) => toggleLoop(event.target.checked)}
                disabled={!settings.enabled}
                className="h-4 w-4 rounded border-[var(--border)]"
              />
            </label>
          </div>
        </section>
      ) : null}
    </div>
  );
}
