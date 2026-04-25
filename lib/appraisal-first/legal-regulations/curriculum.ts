import type { CivilLawCurriculumMapping } from "@/lib/appraisal-first/types";

export type LegalRegulationsCurriculumMapping = CivilLawCurriculumMapping & {
  lawAreaId: "appraisal_act" | "public_notice_act" | "land_compensation_act";
  lawAreaName: string;
  articleRefs: string[];
  testedRuleType: "definition" | "requirement" | "procedure" | "deadline" | "authority" | "exception" | "scope" | "sanction";
  choiceTrapType:
    | "none"
    | "exception"
    | "deadline"
    | "authority_subject"
    | "scope_limit"
    | "procedure_order"
    | "similar_statute";
  legalStructureType:
    | "single_article"
    | "article_exception"
    | "multi_step_procedure"
    | "institution_comparison"
    | "scope_application";
  requiresDeadlineMemory: boolean;
  requiresAuthoritySubject: boolean;
  requiresProcedureOrder: boolean;
  requiresScopeFiltering: boolean;
  primaryLegalFailureAxis:
    | "article_recall"
    | "deadline"
    | "authority_subject"
    | "procedure_order"
    | "scope_exception"
    | "similar_statute"
    | "sanction";
};

export const LEGAL_REGULATIONS_CURRICULUM_MAPPINGS: LegalRegulationsCurriculumMapping[] = [
  {
    questionId: "law-1",
    primaryNodeId: "appraisal_law.appraisal_act.appraiser_duty.fairness",
    linkedNodeIds: ["appraisal_law.appraisal_act.appraiser_duty.independence"],
    chapterId: "appraiser_system",
    chapterName: "Appraiser System",
    topicId: "appraiser_duty",
    topicName: "Appraiser Duties",
    subtopicId: "fairness",
    subtopicName: "Fairness and independence duty",
    correctChoiceId: "2",
    expectedSeconds: 80,
    difficulty: "medium",
    examWeight: 4,
    reviewWeight: 4,
    coachingWeight: 4,
    testedConceptType: "rule",
    requiresArticleMemory: true,
    requiresCaseLogic: false,
    requiresComparison: true,
    mappingConfidence: "high",
    defaultRootCauseTags: ["statute_article_recall_gap", "choice_comparison_failure"],
    lawAreaId: "appraisal_act",
    lawAreaName: "Appraisal Act",
    articleRefs: ["Appraisal Act sample duty article"],
    testedRuleType: "requirement",
    choiceTrapType: "authority_subject",
    legalStructureType: "single_article",
    requiresDeadlineMemory: false,
    requiresAuthoritySubject: true,
    requiresProcedureOrder: false,
    requiresScopeFiltering: false,
    primaryLegalFailureAxis: "authority_subject",
  },
  {
    questionId: "law-2",
    primaryNodeId: "appraisal_law.land_compensation.compensation_process.adjudication",
    linkedNodeIds: ["appraisal_law.land_compensation.compensation_process.consultation"],
    chapterId: "compensation_process",
    chapterName: "Compensation Procedure",
    topicId: "adjudication",
    topicName: "Expropriation Adjudication",
    subtopicId: "procedure_order",
    subtopicName: "Consultation to adjudication order",
    correctChoiceId: "4",
    expectedSeconds: 95,
    difficulty: "high",
    examWeight: 5,
    reviewWeight: 5,
    coachingWeight: 5,
    testedConceptType: "case_application",
    requiresArticleMemory: true,
    requiresCaseLogic: true,
    requiresComparison: true,
    mappingConfidence: "high",
    defaultRootCauseTags: ["procedure_order_confusion", "deadline_requirement_gap"],
    lawAreaId: "land_compensation_act",
    lawAreaName: "Land Compensation Act",
    articleRefs: ["Land Compensation Act sample consultation article", "Land Compensation Act sample adjudication article"],
    testedRuleType: "procedure",
    choiceTrapType: "procedure_order",
    legalStructureType: "multi_step_procedure",
    requiresDeadlineMemory: true,
    requiresAuthoritySubject: true,
    requiresProcedureOrder: true,
    requiresScopeFiltering: false,
    primaryLegalFailureAxis: "procedure_order",
  },
  {
    questionId: "law-3",
    primaryNodeId: "appraisal_law.public_notice.standard_land.price_notice",
    linkedNodeIds: ["appraisal_law.public_notice.individual_land.price_notice"],
    chapterId: "land_price_notice",
    chapterName: "Land Price Notice",
    topicId: "standard_land_price",
    topicName: "Standard Land Price Notice",
    subtopicId: "notice_subject",
    subtopicName: "Notice authority and procedure",
    correctChoiceId: "1",
    expectedSeconds: 85,
    difficulty: "medium",
    examWeight: 5,
    reviewWeight: 5,
    coachingWeight: 5,
    testedConceptType: "comparison",
    requiresArticleMemory: true,
    requiresCaseLogic: false,
    requiresComparison: true,
    mappingConfidence: "high",
    defaultRootCauseTags: ["authority_subject_confusion", "similar_statute_confusion"],
    lawAreaId: "public_notice_act",
    lawAreaName: "Real Estate Price Notice Act",
    articleRefs: ["Real Estate Price Notice Act sample standard land article", "Real Estate Price Notice Act sample individual land article"],
    testedRuleType: "authority",
    choiceTrapType: "authority_subject",
    legalStructureType: "institution_comparison",
    requiresDeadlineMemory: false,
    requiresAuthoritySubject: true,
    requiresProcedureOrder: true,
    requiresScopeFiltering: true,
    primaryLegalFailureAxis: "authority_subject",
  },
  {
    questionId: "law-4",
    primaryNodeId: "appraisal_law.appraisal_act.report.required_items",
    linkedNodeIds: ["appraisal_law.appraisal_act.report.basis_documents"],
    chapterId: "appraisal_process",
    chapterName: "Appraisal Procedure",
    topicId: "appraisal_report",
    topicName: "Appraisal Report",
    subtopicId: "required_items",
    subtopicName: "Required report items",
    correctChoiceId: "2",
    expectedSeconds: 70,
    difficulty: "low",
    examWeight: 4,
    reviewWeight: 4,
    coachingWeight: 4,
    testedConceptType: "exception",
    requiresArticleMemory: true,
    requiresCaseLogic: false,
    requiresComparison: false,
    mappingConfidence: "high",
    defaultRootCauseTags: ["exception_clause_missed", "statute_scope_missed"],
    lawAreaId: "appraisal_act",
    lawAreaName: "Appraisal Act",
    articleRefs: ["Appraisal Act sample report article"],
    testedRuleType: "exception",
    choiceTrapType: "exception",
    legalStructureType: "article_exception",
    requiresDeadlineMemory: false,
    requiresAuthoritySubject: false,
    requiresProcedureOrder: false,
    requiresScopeFiltering: true,
    primaryLegalFailureAxis: "scope_exception",
  },
  {
    questionId: "law-5",
    primaryNodeId: "appraisal_law.appraisal_act.standards.application",
    linkedNodeIds: ["appraisal_law.appraisal_act.standards.reference_materials"],
    chapterId: "appraisal_standards",
    chapterName: "Appraisal Standards",
    topicId: "valuation_standards",
    topicName: "Valuation Standards Application",
    subtopicId: "standards_application",
    subtopicName: "Scope-limited standards application",
    correctChoiceId: "3",
    expectedSeconds: 85,
    difficulty: "medium",
    examWeight: 4,
    reviewWeight: 4,
    coachingWeight: 4,
    testedConceptType: "rule",
    requiresArticleMemory: true,
    requiresCaseLogic: true,
    requiresComparison: true,
    mappingConfidence: "high",
    defaultRootCauseTags: ["condition_combination_failure", "choice_comparison_failure"],
    lawAreaId: "appraisal_act",
    lawAreaName: "Appraisal Act",
    articleRefs: ["Appraisal Act sample standards article"],
    testedRuleType: "requirement",
    choiceTrapType: "scope_limit",
    legalStructureType: "scope_application",
    requiresDeadlineMemory: false,
    requiresAuthoritySubject: false,
    requiresProcedureOrder: false,
    requiresScopeFiltering: true,
    primaryLegalFailureAxis: "scope_exception",
  },
];

export function getLegalRegulationsCurriculumMapping(questionId: string) {
  return LEGAL_REGULATIONS_CURRICULUM_MAPPINGS.find((mapping) => mapping.questionId === questionId);
}
