import "server-only";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  assertValidS233ContractValue,
  validateS233AnswerPackIdentity,
  validateS233AnswerPackRegistryContext,
  type S233AnswerPackIdentity,
  type S233AnswerPackRegistryContext,
} from "./s233-parallel-execution-contract";
import { isS233aReleasedAnswerPack } from "./s233a-answer-pack-release";
import { buildS233aTrustedScoringContext } from "./s233a-scoring-ontology";
import { sha256S233a } from "./s233a-fingerprint";
import type { S233aTrustedReviewMaterials } from "./s233a-types";
import type { RubricEvidenceSubject } from "./rubric-evidence-contract";

type MaterialEnvelope = {
  answerPack?: unknown;
  packIdentity?: unknown;
  answerPackRegistryContext?: unknown;
  registryContext?: unknown;
  evaluationMaterial?: {
    referenceText?: unknown;
  };
  studyContent?: {
    L2_exam_length_answer?: unknown;
  };
};

type IndexedMaterial = {
  pack: S233AnswerPackIdentity;
  registry: S233AnswerPackRegistryContext;
  evaluationReferenceText: string;
  receiptId: string;
};

export class S233aTrustedMaterialUnavailableError extends Error {
  readonly code = "S233A_TRUSTED_MATERIAL_UNAVAILABLE";

  constructor() {
    super("s233a-trusted-material-unavailable");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function referenceTextOf(envelope: MaterialEnvelope): string {
  const direct = envelope.evaluationMaterial?.referenceText;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const level = envelope.studyContent?.L2_exam_length_answer;
  if (typeof level === "string" && level.trim()) return level.trim();
  return "";
}

function findEnvelopes(value: unknown, depth = 0): MaterialEnvelope[] {
  if (depth > 8 || !value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((entry) => findEnvelopes(entry, depth + 1));
  const record = value as Record<string, unknown>;
  const own =
    "answerPack" in record || "packIdentity" in record
      ? [record as MaterialEnvelope]
      : [];
  return [
    ...own,
    ...Object.values(record).flatMap((entry) => findEnvelopes(entry, depth + 1)),
  ];
}

async function listJsonFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(root, entry.name);
      if (entry.isDirectory()) return listJsonFiles(target);
      return entry.isFile() && entry.name.endsWith(".json") ? [target] : [];
    }),
  );
  return nested.flat().sort();
}

async function buildIndex(root: string): Promise<IndexedMaterial[]> {
  const files = await listJsonFiles(root);
  const indexed: IndexedMaterial[] = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(source) as unknown;
    } catch {
      continue;
    }
    for (const envelope of findEnvelopes(parsed)) {
      const rawPack = envelope.answerPack ?? envelope.packIdentity;
      const rawRegistry = envelope.answerPackRegistryContext ?? envelope.registryContext;
      if (!isRecord(rawPack) || !isRecord(rawRegistry)) continue;
      const packValidation = validateS233AnswerPackIdentity(rawPack);
      const registryValidation = validateS233AnswerPackRegistryContext(rawPack, rawRegistry);
      if (!packValidation.valid || !registryValidation.valid) continue;
      if (!isS233aReleasedAnswerPack(
        rawPack as S233AnswerPackIdentity,
        rawRegistry as S233AnswerPackRegistryContext,
      )) continue;
      const evaluationReferenceText = referenceTextOf(envelope);
      if (!evaluationReferenceText) continue;
      indexed.push({
        pack: rawPack as S233AnswerPackIdentity,
        registry: rawRegistry as S233AnswerPackRegistryContext,
        evaluationReferenceText,
        receiptId: `material-${sha256S233a(source).slice(0, 32)}`,
      });
    }
  }
  return indexed;
}

let cachedIndex: Promise<IndexedMaterial[]> | null = null;

export async function loadS233aTrustedReviewMaterials(input: {
  answerPackId: string;
  answerPackVersion: string;
  subject: RubricEvidenceSubject;
  root?: string;
}): Promise<S233aTrustedReviewMaterials> {
  const root = input.root ?? path.join(process.cwd(), "reference_corpus", "reference_answers", "second");
  if (input.root) {
    cachedIndex = null;
  }
  const index = input.root
    ? await buildIndex(root)
    : await (cachedIndex ??= buildIndex(root));
  const found = index.find(
    (entry) =>
      entry.pack.packId === input.answerPackId &&
      entry.pack.packVersion === input.answerPackVersion &&
      entry.pack.subject === input.subject,
  );
  if (!found) throw new S233aTrustedMaterialUnavailableError();
  assertValidS233ContractValue(validateS233AnswerPackIdentity(found.pack));
  assertValidS233ContractValue(
    validateS233AnswerPackRegistryContext(found.pack, found.registry),
  );
  if (!isS233aReleasedAnswerPack(found.pack, found.registry)) {
    throw new S233aTrustedMaterialUnavailableError();
  }
  return {
    answerPack: structuredClone(found.pack),
    answerPackRegistryContext: structuredClone(found.registry),
    trustedScoringContext: buildS233aTrustedScoringContext(input.subject),
    evaluationReferenceText: found.evaluationReferenceText,
    materialReceiptId: found.receiptId,
  };
}

export function resetS233aTrustedMaterialCacheForTests(): void {
  cachedIndex = null;
}
