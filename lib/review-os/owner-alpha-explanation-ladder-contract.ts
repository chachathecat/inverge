import type {
  OwnerAlphaAiLearningReference,
  OwnerAlphaClaimState,
} from "./owner-alpha-practice-contract";
import type { OwnerAlphaPracticeSubject } from "./owner-alpha-subject-adapter-contract";

export const OWNER_ALPHA_EXPLANATION_LADDER_CONTRACT_VERSION =
  "owner_alpha_explanation_ladder.v1" as const;

export const OWNER_ALPHA_EXPLANATION_LADDER_LEVELS = [
  "l1",
  "l2",
  "l3",
] as const;

export type OwnerAlphaExplanationLadderLevel =
  (typeof OWNER_ALPHA_EXPLANATION_LADDER_LEVELS)[number];

export const OWNER_ALPHA_PRACTICAL_EXPLANATION_BLOCKS = [
  "solution_direction",
  "exam_core",
  "calculation_or_method_trap",
  "ten_second_calculation_or_method_check",
] as const;

export const OWNER_ALPHA_THEORY_EXPLANATION_BLOCKS = [
  "easy_explanation",
  "exam_answer_one_line",
  "argument_connection",
  "comparison_evaluation_check",
] as const;

export const OWNER_ALPHA_LAW_EXPLANATION_BLOCKS = [
  "easy_explanation",
  "legal_basis_candidates",
  "requirement_subsumption_trap",
  "ten_second_issue_or_requirement_check",
] as const;

export type OwnerAlphaPracticalExplanationBlockType =
  (typeof OWNER_ALPHA_PRACTICAL_EXPLANATION_BLOCKS)[number];
export type OwnerAlphaTheoryExplanationBlockType =
  (typeof OWNER_ALPHA_THEORY_EXPLANATION_BLOCKS)[number];
export type OwnerAlphaLawExplanationBlockType =
  (typeof OWNER_ALPHA_LAW_EXPLANATION_BLOCKS)[number];
export type OwnerAlphaExplanationBlockType =
  | OwnerAlphaPracticalExplanationBlockType
  | OwnerAlphaTheoryExplanationBlockType
  | OwnerAlphaLawExplanationBlockType;

export type OwnerAlphaExplanationLadderBlock<
  TBlockType extends OwnerAlphaExplanationBlockType,
> = {
  blockType: TBlockType;
  level: OwnerAlphaExplanationLadderLevel;
  sectionIndex: number;
  claimIds: string[];
  calculationNodeIds: string[];
  checkQuestionId: string | null;
};

export type OwnerAlphaPracticalExplanationBlocks = [
  OwnerAlphaExplanationLadderBlock<"solution_direction">,
  OwnerAlphaExplanationLadderBlock<"exam_core">,
  OwnerAlphaExplanationLadderBlock<"calculation_or_method_trap">,
  OwnerAlphaExplanationLadderBlock<"ten_second_calculation_or_method_check">,
];

export type OwnerAlphaTheoryExplanationBlocks = [
  OwnerAlphaExplanationLadderBlock<"easy_explanation">,
  OwnerAlphaExplanationLadderBlock<"exam_answer_one_line">,
  OwnerAlphaExplanationLadderBlock<"argument_connection">,
  OwnerAlphaExplanationLadderBlock<"comparison_evaluation_check">,
];

export type OwnerAlphaLawExplanationBlocks = [
  OwnerAlphaExplanationLadderBlock<"easy_explanation">,
  OwnerAlphaExplanationLadderBlock<"legal_basis_candidates">,
  OwnerAlphaExplanationLadderBlock<"requirement_subsumption_trap">,
  OwnerAlphaExplanationLadderBlock<"ten_second_issue_or_requirement_check">,
];

export type OwnerAlphaExactFourSubjectBlocks =
  | OwnerAlphaPracticalExplanationBlocks
  | OwnerAlphaTheoryExplanationBlocks
  | OwnerAlphaLawExplanationBlocks;

type OwnerAlphaExplanationLadderBase = {
  contractVersion: typeof OWNER_ALPHA_EXPLANATION_LADDER_CONTRACT_VERSION;
  parentReferenceId: string;
};

export type OwnerAlphaExplanationLadderV1 =
  | (OwnerAlphaExplanationLadderBase & {
      subject: "appraisal_practical";
      blocks: OwnerAlphaPracticalExplanationBlocks;
    })
  | (OwnerAlphaExplanationLadderBase & {
      subject: "appraisal_theory";
      blocks: OwnerAlphaTheoryExplanationBlocks;
    })
  | (OwnerAlphaExplanationLadderBase & {
      subject: "appraisal_compensation_law";
      blocks: OwnerAlphaLawExplanationBlocks;
    });

const TOP_LEVEL_KEYS = [
  "blocks",
  "contractVersion",
  "parentReferenceId",
  "subject",
] as const;
const BLOCK_KEYS = [
  "blockType",
  "calculationNodeIds",
  "checkQuestionId",
  "claimIds",
  "level",
  "sectionIndex",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function hasUniqueNonEmptyStrings(
  value: unknown,
  options: { min: number; max: number },
) {
  return (
    Array.isArray(value) &&
    value.length >= options.min &&
    value.length <= options.max &&
    value.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0 &&
        item.length <= 160,
    ) &&
    new Set(value).size === value.length
  );
}

export function ownerAlphaExpectedExplanationBlocks(
  subject: OwnerAlphaPracticeSubject,
): readonly OwnerAlphaExplanationBlockType[] {
  if (subject === "appraisal_practical") {
    return OWNER_ALPHA_PRACTICAL_EXPLANATION_BLOCKS;
  }
  if (subject === "appraisal_theory") {
    return OWNER_ALPHA_THEORY_EXPLANATION_BLOCKS;
  }
  return OWNER_ALPHA_LAW_EXPLANATION_BLOCKS;
}

export function ownerAlphaExplanationBlockLabel(
  blockType: OwnerAlphaExplanationBlockType,
) {
  const labels: Record<OwnerAlphaExplanationBlockType, string> = {
    solution_direction: "풀이 방향",
    exam_core: "시험용 핵심",
    calculation_or_method_trap: "계산·방법 선택 함정",
    ten_second_calculation_or_method_check: "10초 계산·방법 확인",
    easy_explanation: "쉬운 설명",
    exam_answer_one_line: "시험 답안 한 줄",
    argument_connection: "논증 연결",
    comparison_evaluation_check: "비교·평가 확인",
    legal_basis_candidates: "법적 근거 후보",
    requirement_subsumption_trap: "요건·포섭 함정",
    ten_second_issue_or_requirement_check: "10초 쟁점·요건 확인",
  };
  return labels[blockType];
}

export function isOwnerAlphaExplanationLadderV1(
  value: unknown,
): value is OwnerAlphaExplanationLadderV1 {
  if (!isRecord(value) || !hasExactKeys(value, TOP_LEVEL_KEYS)) return false;
  if (
    value.contractVersion !== OWNER_ALPHA_EXPLANATION_LADDER_CONTRACT_VERSION ||
    typeof value.parentReferenceId !== "string" ||
    !value.parentReferenceId.trim() ||
    ![
      "appraisal_practical",
      "appraisal_theory",
      "appraisal_compensation_law",
    ].includes(String(value.subject)) ||
    !Array.isArray(value.blocks)
  ) {
    return false;
  }
  const subject = value.subject as OwnerAlphaPracticeSubject;
  const expected = ownerAlphaExpectedExplanationBlocks(subject);
  if (value.blocks.length !== expected.length) return false;
  return value.blocks.every((block, index) => {
    if (!isRecord(block) || !hasExactKeys(block, BLOCK_KEYS)) return false;
    return (
      block.blockType === expected[index] &&
      OWNER_ALPHA_EXPLANATION_LADDER_LEVELS.includes(
        block.level as OwnerAlphaExplanationLadderLevel,
      ) &&
      Number.isInteger(block.sectionIndex) &&
      Number(block.sectionIndex) >= 0 &&
      hasUniqueNonEmptyStrings(block.claimIds, { min: 1, max: 40 }) &&
      hasUniqueNonEmptyStrings(block.calculationNodeIds, { min: 0, max: 60 }) &&
      (block.checkQuestionId === null ||
        (typeof block.checkQuestionId === "string" &&
          block.checkQuestionId.trim().length > 0 &&
          block.checkQuestionId.length <= 200))
    );
  });
}

function claimById(reference: OwnerAlphaAiLearningReference) {
  return new Map(reference.claims.map((claim) => [claim.claimId, claim]));
}

function calculationNodeById(reference: OwnerAlphaAiLearningReference) {
  return new Map(
    reference.calculationGraph.nodes.map((node) => [node.nodeId, node]),
  );
}

function sectionCount(
  reference: OwnerAlphaAiLearningReference,
  level: OwnerAlphaExplanationLadderLevel,
) {
  return reference[level].sections.length;
}

export function ownerAlphaExplanationLadderReleaseBlockers(input: {
  ladder: unknown;
  parentReference: OwnerAlphaAiLearningReference;
  subject: OwnerAlphaPracticeSubject;
  checkQuestionIds: readonly string[];
}) {
  if (!isOwnerAlphaExplanationLadderV1(input.ladder)) {
    return ["explanation_ladder:invalid_contract"];
  }
  const ladder = input.ladder;
  const blockers: string[] = [];
  if (ladder.parentReferenceId !== input.parentReference.referenceId) {
    blockers.push("explanation_ladder:foreign_parent_reference");
  }
  if (ladder.subject !== input.subject) {
    blockers.push("explanation_ladder:foreign_subject");
  }
  const claims = claimById(input.parentReference);
  const calculationNodes = calculationNodeById(input.parentReference);
  const questions = new Set(input.checkQuestionIds);
  for (const block of ladder.blocks) {
    if (block.sectionIndex >= sectionCount(input.parentReference, block.level)) {
      blockers.push(`explanation_ladder:invalid_section:${block.blockType}`);
    }
    for (const claimId of block.claimIds) {
      if (!claims.has(claimId)) {
        blockers.push(`explanation_ladder:unbound_claim:${block.blockType}`);
      }
    }
    for (const calculationNodeId of block.calculationNodeIds) {
      const calculationNode = calculationNodes.get(calculationNodeId);
      if (!calculationNode) {
        blockers.push(
          `explanation_ladder:unbound_calculation:${block.blockType}`,
        );
        continue;
      }
      const isRelevant = block.claimIds.some((claimId) => {
        const claim = claims.get(claimId);
        return (
          calculationNode.claimId === claimId ||
          claim?.calculationNodeId === calculationNodeId
        );
      });
      if (!isRelevant) {
        blockers.push(
          `explanation_ladder:irrelevant_calculation:${block.blockType}`,
        );
      }
    }
    for (const claimId of block.claimIds) {
      const claim = claims.get(claimId);
      if (
        claim?.calculationNodeId &&
        !block.calculationNodeIds.includes(claim.calculationNodeId)
      ) {
        blockers.push(
          `explanation_ladder:missing_calculation:${block.blockType}`,
        );
      }
    }
    if (
      ladder.subject === "appraisal_theory" &&
      block.calculationNodeIds.length > 0
    ) {
      blockers.push("explanation_ladder:theory_substantive_scoring_prohibited");
    }
    if (
      block.checkQuestionId !== null &&
      !questions.has(block.checkQuestionId)
    ) {
      blockers.push(`explanation_ladder:invalid_question:${block.blockType}`);
    }
  }
  return [...new Set(blockers)];
}

export function remapOwnerAlphaExplanationLadderClaimIds(
  ladder: OwnerAlphaExplanationLadderV1,
  claimIdMap: ReadonlyMap<string, string>,
): OwnerAlphaExplanationLadderV1 {
  return {
    ...ladder,
    blocks: ladder.blocks.map((block) => ({
      ...block,
      claimIds: block.claimIds.map(
        (claimId) => claimIdMap.get(claimId) ?? claimId,
      ),
    })) as OwnerAlphaExplanationLadderV1["blocks"],
  } as OwnerAlphaExplanationLadderV1;
}

export function ownerAlphaExplanationLadderClaimIds(
  ladder: OwnerAlphaExplanationLadderV1,
) {
  return [...new Set(ladder.blocks.flatMap((block) => block.claimIds))];
}

export function ownerAlphaExplanationLadderClaims(
  ladder: OwnerAlphaExplanationLadderV1,
  reference: OwnerAlphaAiLearningReference,
): OwnerAlphaClaimState[] {
  const ids = new Set(ownerAlphaExplanationLadderClaimIds(ladder));
  return reference.claims.filter((claim) => ids.has(claim.claimId));
}
