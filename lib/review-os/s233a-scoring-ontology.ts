import { REWRITE_REGRADE_HISTORY_CONTRACT_VERSION } from "./rewrite-regrade-history-contract";
import { RUBRIC_EVIDENCE_CONTRACT_VERSION } from "./rubric-evidence-contract";
import { S211_LAW_ANSWER_REVIEW_ENGINE_VERSION } from "./s211-law-answer-review-engine";
import { S214_REFERENCE_ANSWER_PIPELINE_VERSION } from "./s214-reference-answer-pipeline";
import { S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION } from "./s215-reference-answer-release-gate";
import { S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION } from "./s216-error-notebook-gap-taxonomy";
import { S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION } from "./s217-personal-core-concept-graph";
import { S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION } from "./s218-similar-question-review-scheduler";
import {
  S233_REUSED_CONTRACT_VERSIONS,
  S233_SCORING_ONTOLOGY_VERSION,
  S233_SCORING_SKILL_SCHEMA_VERSION,
  S233_TRUSTED_SCORING_CONTEXT_VERSION,
  assertValidS233ContractValue,
  validateS233TrustedScoringContext,
  type S233ScoringSkillIdentity,
  type S233TrustedScoringContext,
} from "./s233-parallel-execution-contract";
import { S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION } from "./theory-answer-review-engine";
import { S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION } from "./practice-answer-review-engine";
import type { RubricEvidenceSubject } from "./rubric-evidence-contract";

type SkillDefinition = {
  suffix: string;
  archetype: string;
  critical: boolean;
  action: S233ScoringSkillIdentity["remediationActionType"];
};

const DEFINITIONS: Record<RubricEvidenceSubject, readonly SkillDefinition[]> = {
  law: [
    { suffix: "issue", archetype: "law.issue_identification.v1", critical: true, action: "rewrite" },
    { suffix: "rule", archetype: "law.rule_source.v1", critical: false, action: "rewrite" },
    { suffix: "application", archetype: "law.application_conclusion.v1", critical: false, action: "rewrite" },
  ],
  theory: [
    { suffix: "definition", archetype: "theory.definition_basis.v1", critical: true, action: "rewrite" },
    { suffix: "comparison", archetype: "theory.comparison_application.v1", critical: false, action: "rewrite" },
    { suffix: "conclusion", archetype: "theory.conclusion_relevance.v1", critical: false, action: "rewrite" },
  ],
  practice: [
    { suffix: "assumptions", archetype: "practice.assumptions_data.v1", critical: true, action: "recalculate" },
    { suffix: "calculation", archetype: "practice.formula_calculation.v1", critical: false, action: "recalculate" },
    { suffix: "verification", archetype: "practice.unit_crosscheck_conclusion.v1", critical: false, action: "recalculate" },
  ],
};

function buildSkill(subject: RubricEvidenceSubject, definition: SkillDefinition): S233ScoringSkillIdentity {
  const skillId = `s233a-${subject}-${definition.suffix}`;
  return {
    schemaVersion: S233_SCORING_SKILL_SCHEMA_VERSION,
    skillId,
    ontologyVersion: S233_SCORING_ONTOLOGY_VERSION,
    subject,
    taskArchetype: definition.archetype,
    parentSkillIds: [],
    prerequisiteSkillIds: [],
    evidenceRequirements: [
      {
        requirementId: `req-${skillId}-learner`,
        kind: "learner_answer_segment",
        minimumCount: 1,
        required: true,
      },
      {
        requirementId: `req-${skillId}-source`,
        kind: "source_anchor",
        minimumCount: 1,
        required: true,
      },
      {
        requirementId: `req-${skillId}-rubric`,
        kind: "rubric_anchor",
        minimumCount: 1,
        required: true,
      },
    ],
    severity: definition.critical ? "major" : "moderate",
    critical: definition.critical,
    deductionGroup: {
      groupId: `deduction-${skillId}`,
      nonOverlap: true,
      doubleDeductionAllowed: false,
    },
    remediationActionType: definition.action,
    immutable: true,
    containsRawContent: false,
  };
}

const SKILLS = Object.fromEntries(
  (Object.keys(DEFINITIONS) as RubricEvidenceSubject[]).map((subject) => [
    subject,
    DEFINITIONS[subject].map((definition) => buildSkill(subject, definition)),
  ]),
) as Record<RubricEvidenceSubject, S233ScoringSkillIdentity[]>;

export const S233A_REUSED_CONTRACT_BINDINGS = {
  s205: RUBRIC_EVIDENCE_CONTRACT_VERSION,
  s206: REWRITE_REGRADE_HISTORY_CONTRACT_VERSION,
  s211: S211_LAW_ANSWER_REVIEW_ENGINE_VERSION,
  s212: S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION,
  s213: S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION,
  s214: S214_REFERENCE_ANSWER_PIPELINE_VERSION,
  s215: S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION,
  s216: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
  s217: S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION,
  s218: S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION,
} as const;

export function assertS233aReusedContractsMatchFrozen(): void {
  const expected = S233_REUSED_CONTRACT_VERSIONS;
  const actual = S233A_REUSED_CONTRACT_BINDINGS;
  const mismatches = [
    actual.s205 === expected.s205RubricEvidence,
    actual.s206 === expected.s206RewriteRegrade,
    actual.s211 === expected.s211LawReview,
    actual.s212 === expected.s212TheoryReview,
    actual.s213 === expected.s213PracticeReview,
    actual.s214 === expected.s214AnswerPipeline,
    actual.s215 === expected.s215ReleaseGate,
    actual.s216 === expected.s216ErrorTaxonomy,
    actual.s217 === expected.s217ConceptGraph,
    actual.s218 === expected.s218ReviewScheduler,
  ];
  if (mismatches.some((matches) => !matches)) {
    throw new Error("s233a-frozen-contract-version-mismatch");
  }
}

export function getS233aSubjectSkills(subject: RubricEvidenceSubject): S233ScoringSkillIdentity[] {
  assertS233aReusedContractsMatchFrozen();
  return structuredClone(SKILLS[subject]);
}

export function getS233aRubricAnchorId(skillId: string): string {
  return `rubric-${skillId}`;
}

export function buildS233aTrustedScoringContext(
  subject: RubricEvidenceSubject,
): S233TrustedScoringContext {
  const canonicalSkills = getS233aSubjectSkills(subject);
  const context: S233TrustedScoringContext = {
    contextVersion: S233_TRUSTED_SCORING_CONTEXT_VERSION,
    ontologyAdapterVersion: "s233.canonical_ontology_adapter.v1",
    rubricAdapterVersion: "s233.s205_rubric_adapter.v1",
    ontologyVersion: S233_SCORING_ONTOLOGY_VERSION,
    rubricVersion: S233_REUSED_CONTRACT_VERSIONS.s205RubricEvidence,
    snapshotReceiptId: `s233a-ontology-${subject}-v1`,
    canonicalSkills,
    rubricAnchors: canonicalSkills.map((skill) => ({
      rubricAnchorId: getS233aRubricAnchorId(skill.skillId),
      subject,
      skillId: skill.skillId,
    })),
  };
  assertValidS233ContractValue(validateS233TrustedScoringContext(context));
  return context;
}
