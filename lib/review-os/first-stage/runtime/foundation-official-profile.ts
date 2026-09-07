import { FirstStageKernelError } from "../kernel/domain";
function fail(): never { throw new FirstStageKernelError("adapter_mismatch"); }

export const OFFICIAL_SUBJECTS = ["civil_law", "economics_principles", "real_estate_principles", "appraiser_related_law", "accounting"] as const;
export const ORIGINAL_2026_PROFILE = Object.freeze({ year: 2026, round: 37,
  id: "appraiser_2026_round_37_first", examDate: "2026-04-04", numbering: "subject" as const });
// Only the historical profile already in the Owner's r3 request, not a general
// year selector. These other subjects are key-table positions, NOT runtime scope.
export const ECONOMICS_R3_PROFILE = Object.freeze({ year: 2025, round: 36,
  id: "appraiser_2025_round_36_first", examDate: "2025-04-05", numbering: "session" as const });
export type OfficialProfile = typeof ORIGINAL_2026_PROFILE | typeof ECONOMICS_R3_PROFILE;
function index(subject: unknown) {
  const index = OFFICIAL_SUBJECTS.indexOf(subject as typeof OFFICIAL_SUBJECTS[number]);
  if (index < 0) fail(); return index;
}
export function profileSession(subject: unknown, profile: OfficialProfile = ORIGINAL_2026_PROFILE) {
  const session = index(subject) < 3 ? 1 : 2;
  return profile === ECONOMICS_R3_PROFILE ? `qnet-2025-36-s${session}-A` : `first_2026_session_${session}`;
}
export function profileQuestionNumber(subject: unknown, position: number, profile: OfficialProfile = ORIGINAL_2026_PROFILE) {
  if (!Number.isSafeInteger(position) || position < 1 || position > 40) fail();
  const i = index(subject);
  return profile === ECONOMICS_R3_PROFILE ? (i < 3 ? i : i - 3) * 40 + position : position;
}
export function profileForQuestion(reference: Record<string, unknown>): OfficialProfile {
  if (reference.examYear === 2026 && reference.examRound === 37 &&
    ["civil_law", "appraiser_related_law", "real_estate_principles"].includes(String(reference.subjectId))) return ORIGINAL_2026_PROFILE;
  if (reference.examYear === 2025 && reference.examRound === 36 && reference.subjectId === "economics_principles") return ECONOMICS_R3_PROFILE;
  return fail();
}
