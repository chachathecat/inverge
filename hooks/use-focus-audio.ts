"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_FOCUS_AUDIO_SETTINGS,
  FOCUS_AUDIO_STORAGE_KEY,
  getFocusAudioTrack,
  sanitizeFocusAudioSettings,
  type FocusAudioSettings,
  type FocusAudioTrackId,
} from "@/lib/inverge/focus-audio";

type FocusAudioPlaybackState = "idle" | "playing" | "paused" | "waiting_for_interaction" | "error";

function readStoredFocusAudioSettings() {
  if (typeof window === "undefined") {
    return DEFAULT_FOCUS_AUDIO_SETTINGS;
  }

  try {
    const stored = window.localStorage.getItem(FOCUS_AUDIO_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_FOCUS_AUDIO_SETTINGS;
    }

    return sanitizeFocusAudioSettings(JSON.parse(stored));
  } catch {
    return DEFAULT_FOCUS_AUDIO_SETTINGS;
  }
}

export function useFocusAudio() {
  const [settings, setSettings] = useState<FocusAudioSettings>(readStoredFocusAudioSettings);
  const [isReady] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [playbackState, setPlaybackState] = useState<FocusAudioPlaybackState>(() =>
    readStoredFocusAudioSettings().enabled ? "idle" : "paused",
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingAutoplayRef = useRef(false);
  const track = useMemo(() => getFocusAudioTrack(settings.selectedTrack), [settings.selectedTrack]);

  useEffect(() => {
    if (!isReady) return;
    try {
      window.localStorage.setItem(FOCUS_AUDIO_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage failures for optional UX state.
    }
  }, [isReady, settings]);

  useEffect(() => {
    if (!isReady) return;

    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.src = track.src;
    audio.loop = settings.loop;
    audio.volume = settings.volume;
    audio.preload = "auto";

    if (!settings.enabled) {
      audio.pause();
      audio.currentTime = 0;
      pendingAutoplayRef.current = false;
      return;
    }

    const attemptPlay = async () => {
      try {
        await audio.play();
        pendingAutoplayRef.current = false;
        setPlaybackState("playing");
      } catch {
        pendingAutoplayRef.current = true;
        setPlaybackState("waiting_for_interaction");
      }
    };

    void attemptPlay();
  }, [isReady, settings.enabled, settings.loop, settings.selectedTrack, settings.volume, track.src]);

  useEffect(() => {
    if (!pendingAutoplayRef.current) return;

    const resume = async () => {
      const audio = audioRef.current;
      if (!audio || !settings.enabled) return;
      try {
        await audio.play();
        pendingAutoplayRef.current = false;
        setPlaybackState("playing");
      } catch {
        setPlaybackState("waiting_for_interaction");
      }
    };

    const onUserInteraction = () => {
      void resume();
    };

    window.addEventListener("pointerdown", onUserInteraction, { passive: true });
    window.addEventListener("keydown", onUserInteraction);

    return () => {
      window.removeEventListener("pointerdown", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
    };
  }, [settings.enabled]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  function updateSettings(next: Partial<FocusAudioSettings>) {
    setSettings((current) => ({ ...current, ...next }));
  }

  function toggleEnabled(nextEnabled: boolean) {
    updateSettings({ enabled: nextEnabled });
    if (!nextEnabled) {
      setPlaybackState("paused");
    }
  }

  function selectTrack(nextTrack: FocusAudioTrackId) {
    updateSettings({ selectedTrack: nextTrack });
  }

  function setVolume(nextVolume: number) {
    updateSettings({ volume: Math.max(0, Math.min(nextVolume, 1)) });
  }

  function toggleLoop(nextLoop: boolean) {
    updateSettings({ loop: nextLoop });
  }

  return {
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
  };
}
