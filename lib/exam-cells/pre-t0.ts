import crypto from "node:crypto";

export const SEVEN_EXAM_PRE_T0_CONTRACT_VERSION =
  "dabangil.seven_exam.pre_t0.packet.v1" as const;

export const SEVEN_EXAM_CELL_IDS = Object.freeze([
  "tax_accountant",
  "certified_public_accountant",
  "labor_attorney",
  "judicial_scrivener",
  "patent_attorney",
  "customs_broker",
  "bar_exam",
] as const);

export type SevenExamCellId = (typeof SEVEN_EXAM_CELL_IDS)[number];

export const PRE_T0_REQUIRED_ARTIFACTS = Object.freeze([
  "OFFICIAL_EXAM_DOSSIER",
  "LIFECYCLE_MANIFEST",
  "STAGE_SUBJECT_SCORE_TIME_MANIFEST",
  "OFFICIAL_SOURCE_INVENTORY",
  "RIGHTS_AND_MIRROR_POLICY_CANDIDATE",
  "EFFECTIVE_DATE_POLICY_CANDIDATE",
  "SKILL_GRAPH_CANDIDATE",
  "RUBRIC_CANDIDATE",
  "DETERMINISTIC_VALIDATOR_CANDIDATE",
  "GOLDEN_AND_HOSTILE_PLAN",
  "BOUNDED_SUPPORTED_SCOPE",
  "EXPLICIT_UNSUPPORTED_SCOPE",
  "LANDING_AND_WAITLIST_INPUT",
  "UNRESOLVED_LEDGER",
] as const);

export type PreT0ArtifactKind = (typeof PRE_T0_REQUIRED_ARTIFACTS)[number];

const RAW_BODY_KEYS = new Set([
  "question",
  "questionbody",
  "answer",
  "answerbody",
  "referenceanswer",
  "ocr",
  "ocrtext",
  "prompt",
  "response",
  "sourcebody",
]);

const CELL_STATUS = Object.freeze([
  "SOURCE_PACKET_REQUIRED",
  "SOURCE_INVENTORY_IN_PROGRESS",
  "SOURCE_PACKET_LOCATED_UNCERTIFIED",
  "PRE_T0_PACKET_VALIDATED",
] as const);

type CellStatus = (typeof CELL_STATUS)[number];

type ArtifactStatus =
  | "PENDING"
  | "LOCATED_UNCERTIFIED"
  | "VALIDATED_SOURCE_ONLY";

export type SevenExamPreT0CellInputV1 = Readonly<{
  cellId: SevenExamCellId;
  labelKo: string;
  status: CellStatus;
  officialPrimarySourcesOnly: true;
  rightsDecisionAuthorized: false;
  learnerRuntimeAuthorized: false;
  publicClaimAuthorized: false;
  artifacts: readonly Readonly<{
    kind: PreT0ArtifactKind;
    status: ArtifactStatus;
    locatorCount: number;
  }>[];
}>;

export type SevenExamPreT0PacketInputV1 = Readonly<{
  contractVersion: typeof SEVEN_EXAM_PRE_T0_CONTRACT_VERSION;
  programIssue: 880;
  sourceOnly: true;
  sharedCoreMutationAuthorized: false;
  learnerRuntimeAuthorized: false;
  rightsDecisionAuthorized: false;
  cells: readonly SevenExamPreT0CellInputV1[];
}>;

export type SevenExamPreT0PacketIndexV1 = Readonly<{
  contractVersion: typeof SEVEN_EXAM_PRE_T0_CONTRACT_VERSION;
  packetDigest: string;
  cellCount: 7;
  cells: readonly Readonly<{
    cellId: SevenExamCellId;
    status: CellStatus;
    validatedArtifactCount: number;
    locatedArtifactCount: number;
    pendingArtifactCount: number;
    preT0Ready: boolean;
  }>[];
  allCellsPreT0Ready: boolean;
  runtimeAuthorized: false;
  rightsDecisionAuthorized: false;
}>;

function plainRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null
    ? (value as Record<string, unknown>)
    : null;
}

function assertNoRawBodies(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const entry of value) assertNoRawBodies(entry);
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (RAW_BODY_KEYS.has(key.toLowerCase())) {
      throw new Error("seven-exam-pre-t0:raw-body-forbidden");
    }
    assertNoRawBodies(entry);
  }
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
    .join(",")}}`;
}

function exactSet<T extends string>(actual: readonly T[], expected: readonly T[]) {
  return (
    actual.length === expected.length &&
    [...actual].sort().every((value, index) => value === [...expected].sort()[index])
  );
}

export function validateSevenExamPreT0PacketV1(
  value: unknown,
): SevenExamPreT0PacketIndexV1 {
  const packet = plainRecord(value);
  if (!packet) throw new Error("seven-exam-pre-t0:invalid-packet");
  assertNoRawBodies(packet);
  if (
    packet.contractVersion !== SEVEN_EXAM_PRE_T0_CONTRACT_VERSION ||
    packet.programIssue !== 880 ||
    packet.sourceOnly !== true ||
    packet.sharedCoreMutationAuthorized !== false ||
    packet.learnerRuntimeAuthorized !== false ||
    packet.rightsDecisionAuthorized !== false ||
    !Array.isArray(packet.cells) ||
    packet.cells.length !== SEVEN_EXAM_CELL_IDS.length
  ) {
    throw new Error("seven-exam-pre-t0:invalid-boundary");
  }

  const seen = new Set<string>();
  const cells = packet.cells.map((raw) => {
    const cell = plainRecord(raw);
    if (
      !cell ||
      typeof cell.cellId !== "string" ||
      !SEVEN_EXAM_CELL_IDS.includes(cell.cellId as SevenExamCellId) ||
      seen.has(cell.cellId) ||
      typeof cell.labelKo !== "string" ||
      !cell.labelKo.trim() ||
      !CELL_STATUS.includes(cell.status as CellStatus) ||
      cell.officialPrimarySourcesOnly !== true ||
      cell.rightsDecisionAuthorized !== false ||
      cell.learnerRuntimeAuthorized !== false ||
      cell.publicClaimAuthorized !== false ||
      !Array.isArray(cell.artifacts)
    ) {
      throw new Error("seven-exam-pre-t0:invalid-cell");
    }
    seen.add(cell.cellId);

    const artifactKinds: PreT0ArtifactKind[] = [];
    let validatedArtifactCount = 0;
    let locatedArtifactCount = 0;
    let pendingArtifactCount = 0;
    for (const rawArtifact of cell.artifacts) {
      const artifact = plainRecord(rawArtifact);
      if (
        !artifact ||
        typeof artifact.kind !== "string" ||
        !PRE_T0_REQUIRED_ARTIFACTS.includes(
          artifact.kind as PreT0ArtifactKind,
        ) ||
        artifactKinds.includes(artifact.kind as PreT0ArtifactKind) ||
        !["PENDING", "LOCATED_UNCERTIFIED", "VALIDATED_SOURCE_ONLY"].includes(
          String(artifact.status),
        ) ||
        !Number.isSafeInteger(artifact.locatorCount) ||
        Number(artifact.locatorCount) < 0
      ) {
        throw new Error("seven-exam-pre-t0:invalid-artifact");
      }
      artifactKinds.push(artifact.kind as PreT0ArtifactKind);
      if (artifact.status === "VALIDATED_SOURCE_ONLY") {
        if (Number(artifact.locatorCount) < 1) {
          throw new Error("seven-exam-pre-t0:validated-artifact-unlocated");
        }
        validatedArtifactCount += 1;
      } else if (artifact.status === "LOCATED_UNCERTIFIED") {
        if (Number(artifact.locatorCount) < 1) {
          throw new Error("seven-exam-pre-t0:located-artifact-unlocated");
        }
        locatedArtifactCount += 1;
      } else {
        pendingArtifactCount += 1;
      }
    }
    if (!exactSet(artifactKinds, PRE_T0_REQUIRED_ARTIFACTS)) {
      throw new Error("seven-exam-pre-t0:artifact-set-mismatch");
    }
    const preT0Ready =
      cell.status === "PRE_T0_PACKET_VALIDATED" &&
      validatedArtifactCount === PRE_T0_REQUIRED_ARTIFACTS.length;
    if (
      cell.status === "PRE_T0_PACKET_VALIDATED" &&
      !preT0Ready
    ) {
      throw new Error("seven-exam-pre-t0:false-ready-state");
    }
    return Object.freeze({
      cellId: cell.cellId as SevenExamCellId,
      status: cell.status as CellStatus,
      validatedArtifactCount,
      locatedArtifactCount,
      pendingArtifactCount,
      preT0Ready,
    });
  });

  if (!exactSet([...seen] as SevenExamCellId[], SEVEN_EXAM_CELL_IDS)) {
    throw new Error("seven-exam-pre-t0:cell-set-mismatch");
  }
  const ordered = Object.freeze(
    [...cells].sort((left, right) => left.cellId.localeCompare(right.cellId)),
  );
  const packetDigest = `sha256:${crypto
    .createHash("sha256")
    .update(
      stable({
        contractVersion: SEVEN_EXAM_PRE_T0_CONTRACT_VERSION,
        cells: ordered,
      }),
      "utf8",
    )
    .digest("hex")}`;
  return Object.freeze({
    contractVersion: SEVEN_EXAM_PRE_T0_CONTRACT_VERSION,
    packetDigest,
    cellCount: 7 as const,
    cells: ordered,
    allCellsPreT0Ready: ordered.every((cell) => cell.preT0Ready),
    runtimeAuthorized: false as const,
    rightsDecisionAuthorized: false as const,
  });
}
