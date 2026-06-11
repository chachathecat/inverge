export const CAPTURE_SAVE_PERSISTENCE_STATUSES = ["durable_saved", "local_fallback_saved", "save_failed"] as const;

export type CaptureSavePersistenceStatus = (typeof CAPTURE_SAVE_PERSISTENCE_STATUSES)[number];

export type CaptureSavePersistenceCopy = {
  eyebrow: string;
  title: string;
  description: string;
  statusLabel: string;
};

const CAPTURE_SAVE_PERSISTENCE_COPY: Record<CaptureSavePersistenceStatus, CaptureSavePersistenceCopy> = {
  durable_saved: {
    eyebrow: "저장되었습니다",
    title: "계정 기록에 저장되어 Today, Notes, Review에 반영되었습니다.",
    description: "같은 계정으로 다시 열어도 이어서 확인할 수 있습니다.",
    statusLabel: "계정 기록에 저장",
  },
  local_fallback_saved: {
    eyebrow: "이 브라우저에 임시 저장되었습니다",
    title: "closed beta 안전망으로 Notes, Review, Today에 반영됩니다.",
    description: "계정 저장을 사용할 수 없어 이 브라우저에만 보관했습니다. 같은 브라우저에서는 새로고침 후에도 확인할 수 있습니다.",
    statusLabel: "브라우저 임시 저장",
  },
  save_failed: {
    eyebrow: "저장이 완료되지 않았습니다",
    title: "입력 내용은 아직 화면에 남아 있습니다.",
    description: "잠시 후 다시 저장해 주세요. 계속 실패하면 새로고침하기 전에 입력 내용을 확인해 주세요.",
    statusLabel: "저장 재시도 필요",
  },
};

export function getCaptureSavePersistenceCopy(status: CaptureSavePersistenceStatus) {
  return CAPTURE_SAVE_PERSISTENCE_COPY[status];
}

