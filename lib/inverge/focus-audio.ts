export type FocusAudioTrackId = "deep-focus" | "quiet-flow" | "night-room";

export type FocusAudioTrack = {
  id: FocusAudioTrackId;
  label: string;
  description: string;
  src: string;
};

export type FocusAudioSettings = {
  enabled: boolean;
  selectedTrack: FocusAudioTrackId;
  volume: number;
  loop: boolean;
};

export const FOCUS_AUDIO_STORAGE_KEY = "inverge:focus-audio:v1";

export const FOCUS_AUDIO_TRACKS: FocusAudioTrack[] = [
  {
    id: "deep-focus",
    label: "깊은 집중",
    description: "말수가 적은 저역 중심 배경음입니다.",
    src: "/focus-audio/deep-focus.wav",
  },
  {
    id: "quiet-flow",
    label: "낮은 소리",
    description: "작은 음량에서도 거슬림이 적은 배경음입니다.",
    src: "/focus-audio/quiet-flow.wav",
  },
  {
    id: "night-room",
    label: "늦은 밤",
    description: "차분하게 길게 이어지는 배경음입니다.",
    src: "/focus-audio/night-room.wav",
  },
] as const;

export const DEFAULT_FOCUS_AUDIO_SETTINGS: FocusAudioSettings = {
  enabled: false,
  selectedTrack: "deep-focus",
  volume: 0.35,
  loop: true,
};

export function isFocusAudioTrackId(value: string): value is FocusAudioTrackId {
  return FOCUS_AUDIO_TRACKS.some((track) => track.id === value);
}

export function sanitizeFocusAudioSettings(value: unknown): FocusAudioSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_FOCUS_AUDIO_SETTINGS;
  }

  const raw = value as Partial<FocusAudioSettings>;
  const selectedTrack =
    typeof raw.selectedTrack === "string" && isFocusAudioTrackId(raw.selectedTrack)
      ? raw.selectedTrack
      : DEFAULT_FOCUS_AUDIO_SETTINGS.selectedTrack;
  const volume =
    typeof raw.volume === "number" ? Math.max(0, Math.min(raw.volume, 1)) : DEFAULT_FOCUS_AUDIO_SETTINGS.volume;

  return {
    enabled: Boolean(raw.enabled),
    selectedTrack,
    volume,
    loop: typeof raw.loop === "boolean" ? raw.loop : DEFAULT_FOCUS_AUDIO_SETTINGS.loop,
  };
}

export function getFocusAudioTrack(trackId: FocusAudioTrackId) {
  return FOCUS_AUDIO_TRACKS.find((track) => track.id === trackId) ?? FOCUS_AUDIO_TRACKS[0];
}
