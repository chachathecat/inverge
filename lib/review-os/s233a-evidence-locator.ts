import type { S233aLearnerInputSegment } from "./s233a-types";

export function getS233aUnambiguousSegmentId(
  segments: readonly Pick<S233aLearnerInputSegment, "segmentId">[],
): string | null {
  return segments.length === 1 ? segments[0]?.segmentId ?? null : null;
}
