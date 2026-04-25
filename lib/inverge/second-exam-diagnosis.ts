export type SecondExamSubjectId = "practice" | "theory" | "law";

export type GapType = "issue-missing" | "structure-gap" | "weak-opening" | "weak-conclusion";

export type DiagnosticSeverity = 1 | 2 | 3;

export type CandidateGap = {
  id: string;
  type: GapType;
  title: string;
  summary: string;
  severity: DiagnosticSeverity;
  confidence: number;
  rewriteImpact: 1 | 2 | 3;
  evidence: string[];
  rewriteInstruction: string;
  focusLabel: string;
  rewriteTarget: string;
  selectionScore: number;
  sourceSignalKinds: string[];
};

export type SecondExamRewriteSeed = {
  sourceGapId: string;
  focusLabel: string;
  gapTitle: string;
  gapSummary: string;
  guidanceTitle: string;
  guidance: string[];
  rewriteTarget: string;
  placeholder: string;
  starter: string;
  minimumLength: number;
  internalConfidence: number;
  source: "rule";
};

export type SecondExamRecordsSummarySeed = {
  focusLabel: string;
  gapType: GapType;
  gapTitle: string;
  note: string;
  nextActionLabel: string;
  recurringHint?: string;
  internalConfidence: number;
  createdAt: string;
};

export type SecondExamIssueCoverageSignal = {
  kind: "issue-coverage";
  signal: "issue-covered" | "issue-missing";
  issueId: string;
  issueLabel: string;
  covered: boolean;
  evidence: string[];
  severity: DiagnosticSeverity;
  confidence: number;
  matchedKeywords: string[];
};

export type SecondExamStructureGapSignal = {
  kind: "structure-gap";
  signal: "structure-gap";
  missingSteps: string[];
  detectedSteps: string[];
  outOfOrder: boolean;
  evidence: string[];
  severity: DiagnosticSeverity;
  confidence: number;
};

export type SecondExamWeakOpeningSignal = {
  kind: "weak-opening";
  signal: "weak-opening";
  triggered: boolean;
  missingMarkers: string[];
  evidence: string[];
  severity: DiagnosticSeverity;
  confidence: number;
};

export type SecondExamWeakConclusionSignal = {
  kind: "weak-conclusion";
  signal: "weak-conclusion";
  triggered: boolean;
  missingMarkers: string[];
  evidence: string[];
  severity: DiagnosticSeverity;
  confidence: number;
};

export type SecondExamDiagnosisResult = {
  subjectId: SecondExamSubjectId;
  normalizedAnswerText: string;
  paragraphCount: number;
  signals: {
    issueCoverage: SecondExamIssueCoverageSignal[];
    structureGap: SecondExamStructureGapSignal;
    weakOpening: SecondExamWeakOpeningSignal;
    weakConclusion: SecondExamWeakConclusionSignal;
  };
  gapCandidates: CandidateGap[];
  selectedGap: CandidateGap;
  rewriteSeed: SecondExamRewriteSeed;
  recordsSummarySeed: SecondExamRecordsSummarySeed;
  internalConfidence: {
    selectedGap: number;
    rewriteSeed: number;
    recordsSummary: number;
  };
};

export type DiagnoseSecondExamInput = {
  subjectId: string;
  userAnswerText?: string;
  submittedAt?: string;
  compareHistoryCount?: number;
  rewriteHistoryCount?: number;
};

type SubjectIssueRule = {
  id: string;
  label: string;
  keywords: string[];
};

type SubjectStructureStep = {
  id: string;
  label: string;
  keywords: string[];
};

type SubjectRuleSet = {
  defaultGapType: GapType;
  fallbackEvidence: string[];
  issueRules: SubjectIssueRule[];
  structureSteps: SubjectStructureStep[];
  openingMarkers: string[];
  conclusionMarkers: string[];
  subjectTerms: string[];
};

const SUBJECT_RULES: Record<SecondExamSubjectId, SubjectRuleSet> = {
  practice: {
    defaultGapType: "weak-conclusion",
    fallbackEvidence: ["The answer ends without clearly fixing the final judgment sentence."],
    issueRules: [
      { id: "practice-target", label: "target or valuation basis", keywords: ["대상", "기준", "valuation", "basis"] },
      { id: "practice-calculation", label: "calculation flow", keywords: ["계산", "산정", "시산", "조정", "calculation"] },
      { id: "practice-judgment", label: "final judgment", keywords: ["결론", "판단", "평가액", "따라서", "judgment"] },
    ],
    structureSteps: [
      { id: "opening", label: "opening", keywords: ["대상", "쟁점", "기준", "본 사안", "valuation"] },
      { id: "calculation", label: "calculation", keywords: ["계산", "산정", "시산", "조정", "비준"] },
      { id: "conclusion", label: "conclusion", keywords: ["따라서", "결론", "평가액", "판단"] },
    ],
    openingMarkers: ["본 사안", "대상", "기준", "평가", "valuation"],
    conclusionMarkers: ["따라서", "결론", "판단", "평가액", "정리하면"],
    subjectTerms: ["계산", "결론", "판단", "평가"],
  },
  theory: {
    defaultGapType: "weak-opening",
    fallbackEvidence: ["The first sentence stays descriptive and does not anchor the issue."],
    issueRules: [
      { id: "theory-issue", label: "issue framing", keywords: ["쟁점", "문제", "핵심", "issue"] },
      { id: "theory-definition", label: "definition or concept", keywords: ["의의", "개념", "정의", "concept"] },
      { id: "theory-ground", label: "reasoning or conclusion", keywords: ["근거", "이유", "따라서", "결론", "판단"] },
    ],
    structureSteps: [
      { id: "opening", label: "opening", keywords: ["쟁점", "문제", "핵심", "issue"] },
      { id: "definition", label: "definition", keywords: ["의의", "개념", "정의"] },
      { id: "reasoning", label: "reasoning", keywords: ["근거", "이유", "판단", "검토"] },
      { id: "conclusion", label: "conclusion", keywords: ["따라서", "결론", "정리하면"] },
    ],
    openingMarkers: ["쟁점", "문제", "핵심", "issue", "본 사안"],
    conclusionMarkers: ["따라서", "결론", "정리하면", "판단"],
    subjectTerms: ["쟁점", "문단", "근거", "결론"],
  },
  law: {
    defaultGapType: "structure-gap",
    fallbackEvidence: ["The answer cites a rule but does not connect it to the case in a clear order."],
    issueRules: [
      { id: "law-rule", label: "rule or article", keywords: ["조문", "규정", "법", "판례", "rule"] },
      { id: "law-case", label: "case application", keywords: ["사안", "적용", "검토", "case"] },
      { id: "law-conclusion", label: "conclusion", keywords: ["따라서", "결론", "판단"] },
    ],
    structureSteps: [
      { id: "rule", label: "rule", keywords: ["조문", "규정", "법", "판례"] },
      { id: "case", label: "case", keywords: ["사안", "적용", "검토", "본 사안"] },
      { id: "conclusion", label: "conclusion", keywords: ["따라서", "결론", "판단"] },
    ],
    openingMarkers: ["조문", "규정", "쟁점", "본 사안"],
    conclusionMarkers: ["따라서", "결론", "판단"],
    subjectTerms: ["조문", "사안", "적용", "결론"],
  },
};

const GAP_TYPE_PRIORITY: Record<GapType, number> = {
  "issue-missing": 4,
  "structure-gap": 3,
  "weak-conclusion": 2,
  "weak-opening": 1,
};

function clampConfidence(value: number, minimum = 0.24, maximum = 0.94) {
  return Math.max(minimum, Math.min(maximum, Number(value.toFixed(2))));
}

function normalizeAnswerText(answerText?: string) {
  return answerText?.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim() ?? "";
}

function splitParagraphs(answerText: string) {
  if (!answerText) return [];

  const rawParagraphs = answerText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (rawParagraphs.length > 0) {
    return rawParagraphs;
  }

  return answerText
    .split(/(?<=[.!?다요])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function splitSentences(paragraphs: string[]) {
  return paragraphs
    .flatMap((paragraph) => paragraph.split(/(?<=[.!?다요])\s+/))
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function summarizeSecondExamExcerpt(value: string, limit = 120) {
  if (!value) return "No written answer yet.";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}...`;
}

export function summarizeSecondExamAnswer(answerText?: string, limit = 150) {
  const normalized = normalizeAnswerText(answerText);
  return summarizeSecondExamExcerpt(normalized, limit);
}

export function isSecondExamSubjectId(subjectId: string): subjectId is SecondExamSubjectId {
  return subjectId === "practice" || subjectId === "theory" || subjectId === "law";
}

function includesKeyword(text: string, keyword: string) {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function evaluateIssueCoverage(normalizedAnswer: string, ruleSet: SubjectRuleSet): SecondExamIssueCoverageSignal[] {
  return ruleSet.issueRules.map((issueRule) => {
    const matchedKeywords = issueRule.keywords.filter((keyword) => includesKeyword(normalizedAnswer, keyword));
    const covered = matchedKeywords.length > 0;
    const confidence = clampConfidence(
      covered ? 0.56 + matchedKeywords.length * 0.1 : 0.48 + issueRule.keywords.length * 0.02,
    );

    return {
      kind: "issue-coverage",
      signal: covered ? "issue-covered" : "issue-missing",
      issueId: issueRule.id,
      issueLabel: issueRule.label,
      covered,
      evidence: covered ? [matchedKeywords[0]] : [`Missing ${issueRule.label}.`],
      severity: covered ? 1 : 3,
      confidence,
      matchedKeywords,
    };
  });
}

function detectStructureSteps(paragraphs: string[], ruleSet: SubjectRuleSet) {
  const detections = ruleSet.structureSteps
    .map((step) => {
      const paragraphIndex = paragraphs.findIndex((paragraph) =>
        step.keywords.some((keyword) => includesKeyword(paragraph, keyword)),
      );

      return {
        ...step,
        paragraphIndex,
      };
    })
    .filter((step) => step.paragraphIndex >= 0);

  return detections;
}

function evaluateStructureGap(paragraphs: string[], ruleSet: SubjectRuleSet): SecondExamStructureGapSignal {
  const detections = detectStructureSteps(paragraphs, ruleSet);
  const detectedSteps = detections.map((detection) => detection.id);
  const missingSteps = ruleSet.structureSteps.filter((step) => !detectedSteps.includes(step.id)).map((step) => step.id);
  const outOfOrder = detections.some((detection, index) => {
    if (index === 0) return false;
    return detection.paragraphIndex < detections[index - 1].paragraphIndex;
  });
  const evidence =
    detections.length > 0
      ? detections.map((detection) => `${detection.label} in paragraph ${detection.paragraphIndex + 1}`)
      : ruleSet.fallbackEvidence;
  const severity: DiagnosticSeverity =
    missingSteps.length >= 2 || (missingSteps.length >= 1 && outOfOrder) ? 3 : missingSteps.length === 1 || outOfOrder ? 2 : 1;
  const confidence = clampConfidence(0.46 + detectedSteps.length * 0.1 + (outOfOrder ? 0.08 : 0));

  return {
    kind: "structure-gap",
    signal: "structure-gap",
    missingSteps,
    detectedSteps,
    outOfOrder,
    evidence,
    severity,
    confidence,
  };
}

function evaluateWeakOpening(sentences: string[], ruleSet: SubjectRuleSet): SecondExamWeakOpeningSignal {
  const firstSentence = sentences[0] ?? "";
  const matchedMarkers = ruleSet.openingMarkers.filter((marker) => includesKeyword(firstSentence, marker));
  const missingMarkers = ruleSet.openingMarkers.filter((marker) => !matchedMarkers.includes(marker));
  const triggered = !firstSentence || firstSentence.length < 18 || matchedMarkers.length === 0;
  const severity: DiagnosticSeverity = !firstSentence || matchedMarkers.length === 0 ? 3 : firstSentence.length < 30 ? 2 : 1;
  const confidence = clampConfidence(triggered ? 0.62 + (matchedMarkers.length === 0 ? 0.08 : 0) : 0.52);

  return {
    kind: "weak-opening",
    signal: "weak-opening",
    triggered,
    missingMarkers: missingMarkers.slice(0, 3),
    evidence: [summarizeSecondExamExcerpt(firstSentence || "No opening sentence found.", 80)],
    severity,
    confidence,
  };
}

function evaluateWeakConclusion(sentences: string[], ruleSet: SubjectRuleSet): SecondExamWeakConclusionSignal {
  const lastSentence = sentences[sentences.length - 1] ?? "";
  const matchedMarkers = ruleSet.conclusionMarkers.filter((marker) => includesKeyword(lastSentence, marker));
  const missingMarkers = ruleSet.conclusionMarkers.filter((marker) => !matchedMarkers.includes(marker));
  const triggered = !lastSentence || lastSentence.length < 18 || matchedMarkers.length === 0;
  const severity: DiagnosticSeverity = !lastSentence || matchedMarkers.length === 0 ? 3 : lastSentence.length < 30 ? 2 : 1;
  const confidence = clampConfidence(triggered ? 0.64 + (matchedMarkers.length === 0 ? 0.08 : 0) : 0.54);

  return {
    kind: "weak-conclusion",
    signal: "weak-conclusion",
    triggered,
    missingMarkers: missingMarkers.slice(0, 3),
    evidence: [summarizeSecondExamExcerpt(lastSentence || "No conclusion sentence found.", 80)],
    severity,
    confidence,
  };
}

function buildIssueMissingGap(
  subjectId: SecondExamSubjectId,
  issueCoverage: SecondExamIssueCoverageSignal[],
): CandidateGap | null {
  const missingIssues = issueCoverage.filter((signal) => !signal.covered);
  if (missingIssues.length === 0) return null;

  const confidence = clampConfidence(
    missingIssues.reduce((sum, signal) => sum + signal.confidence, 0) / missingIssues.length,
  );
  const severity: DiagnosticSeverity = missingIssues.length >= 2 ? 3 : 2;
  const rewriteImpact: 1 | 2 | 3 = missingIssues.length >= 2 ? 3 : 2;
  const issueLabel = missingIssues[0]?.issueLabel ?? "issue";
  const evidence = missingIssues.map((signal) => signal.evidence[0]).filter(Boolean);

  return {
    id: `${subjectId}-issue-missing`,
    type: "issue-missing",
    title: `One required point is still missing from the answer.`,
    summary:
      missingIssues.length >= 2
        ? `Two or more expected points are not fixed in the current answer. Add the missing issue before polishing tone or flow.`
        : `The answer still leaves out ${issueLabel}. Add that point before rewriting the rest of the paragraph.`,
    severity,
    confidence,
    rewriteImpact,
    evidence,
    rewriteInstruction: `Add the missing point first, then reconnect the paragraph around it.`,
    focusLabel: `Missing point`,
    rewriteTarget: issueLabel,
    selectionScore: severity * 1.4 + rewriteImpact * 1.2 + confidence + GAP_TYPE_PRIORITY["issue-missing"],
    sourceSignalKinds: ["issue-coverage"],
  };
}

function buildStructureGapGap(
  subjectId: SecondExamSubjectId,
  structureGap: SecondExamStructureGapSignal,
): CandidateGap | null {
  if (structureGap.missingSteps.length === 0 && !structureGap.outOfOrder) return null;

  const missingStepLabel = structureGap.missingSteps[0]?.replace(/-/g, " ") ?? "missing step";
  const rewriteImpact: 1 | 2 | 3 = structureGap.severity >= 3 ? 3 : 2;

  return {
    id: `${subjectId}-structure-gap`,
    type: "structure-gap",
    title: `The answer flow still breaks before it closes the reasoning.`,
    summary: structureGap.outOfOrder
      ? `The expected order is visible, but the answer moves out of sequence. Reconnect the steps in one clear order.`
      : `One structural step is still thin or missing. Add ${missingStepLabel} before refining details.`,
    severity: structureGap.severity,
    confidence: structureGap.confidence,
    rewriteImpact,
    evidence: structureGap.evidence.slice(0, 3),
    rewriteInstruction: `Restore the missing step and keep the paragraph order straightforward.`,
    focusLabel: `Structure link`,
    rewriteTarget: missingStepLabel,
    selectionScore: structureGap.severity * 1.4 + rewriteImpact * 1.2 + structureGap.confidence + GAP_TYPE_PRIORITY["structure-gap"],
    sourceSignalKinds: ["structure-gap"],
  };
}

function buildWeakOpeningGap(
  subjectId: SecondExamSubjectId,
  weakOpening: SecondExamWeakOpeningSignal,
): CandidateGap | null {
  if (!weakOpening.triggered) return null;

  return {
    id: `${subjectId}-weak-opening`,
    type: "weak-opening",
    title: `The first sentence does not fix the point quickly enough.`,
    summary: `The opening stays descriptive, so the reader still has to infer the issue. Fix the first sentence before expanding the paragraph.`,
    severity: weakOpening.severity,
    confidence: weakOpening.confidence,
    rewriteImpact: 2,
    evidence: weakOpening.evidence,
    rewriteInstruction: `Rewrite the first sentence so the issue is fixed immediately.`,
    focusLabel: `Opening line`,
    rewriteTarget: `First sentence`,
    selectionScore: weakOpening.severity * 1.4 + 2 * 1.2 + weakOpening.confidence + GAP_TYPE_PRIORITY["weak-opening"],
    sourceSignalKinds: ["weak-opening"],
  };
}

function buildWeakConclusionGap(
  subjectId: SecondExamSubjectId,
  weakConclusion: SecondExamWeakConclusionSignal,
): CandidateGap | null {
  if (!weakConclusion.triggered) return null;

  return {
    id: `${subjectId}-weak-conclusion`,
    type: "weak-conclusion",
    title: `The answer still ends without a firm closing judgment.`,
    summary: `The final line does not fix the conclusion clearly enough. Add one closing judgment sentence before moving on.`,
    severity: weakConclusion.severity,
    confidence: weakConclusion.confidence,
    rewriteImpact: 3,
    evidence: weakConclusion.evidence,
    rewriteInstruction: `Keep the current flow and add one clear closing judgment sentence.`,
    focusLabel: `Closing judgment`,
    rewriteTarget: `Last sentence`,
    selectionScore: weakConclusion.severity * 1.4 + 3 * 1.2 + weakConclusion.confidence + GAP_TYPE_PRIORITY["weak-conclusion"],
    sourceSignalKinds: ["weak-conclusion"],
  };
}

function buildFallbackGap(subjectId: SecondExamSubjectId, ruleSet: SubjectRuleSet): CandidateGap {
  const fallbackType = ruleSet.defaultGapType;
  const baseGap =
    fallbackType === "weak-opening"
      ? buildWeakOpeningGap(subjectId, {
          kind: "weak-opening",
          signal: "weak-opening",
          triggered: true,
          missingMarkers: [],
          evidence: ruleSet.fallbackEvidence,
          severity: 2,
          confidence: 0.48,
        })
      : fallbackType === "structure-gap"
        ? buildStructureGapGap(subjectId, {
            kind: "structure-gap",
            signal: "structure-gap",
            missingSteps: ["case-link"],
            detectedSteps: [],
            outOfOrder: false,
            evidence: ruleSet.fallbackEvidence,
            severity: 2,
            confidence: 0.5,
          })
        : buildWeakConclusionGap(subjectId, {
            kind: "weak-conclusion",
            signal: "weak-conclusion",
            triggered: true,
            missingMarkers: [],
            evidence: ruleSet.fallbackEvidence,
            severity: 2,
            confidence: 0.5,
          });

  return (
    baseGap ?? {
      id: `${subjectId}-fallback-gap`,
      type: "weak-conclusion",
      title: `One part of the answer still needs to be fixed before the next loop.`,
      summary: `Keep the answer simple and fix one sentence that closes the reasoning more clearly.`,
      severity: 2,
      confidence: 0.5,
      rewriteImpact: 2,
      evidence: ruleSet.fallbackEvidence,
      rewriteInstruction: `Rewrite one sentence so the reasoning closes more clearly.`,
      focusLabel: `One correction`,
      rewriteTarget: `One closing sentence`,
      selectionScore: 5,
      sourceSignalKinds: ["fallback"],
    }
  );
}

function selectPrimaryGap(candidates: CandidateGap[], fallbackGap: CandidateGap) {
  if (candidates.length === 0) return fallbackGap;

  const [selectedGap] = [...candidates].sort((left, right) => {
    if (right.selectionScore !== left.selectionScore) {
      return right.selectionScore - left.selectionScore;
    }
    if (right.severity !== left.severity) {
      return right.severity - left.severity;
    }
    if (right.rewriteImpact !== left.rewriteImpact) {
      return right.rewriteImpact - left.rewriteImpact;
    }
    if (right.confidence !== left.confidence) {
      return right.confidence - left.confidence;
    }
    return GAP_TYPE_PRIORITY[right.type] - GAP_TYPE_PRIORITY[left.type];
  });

  return selectedGap.confidence < 0.5 ? fallbackGap : selectedGap;
}

function buildRewriteSeed(subjectId: SecondExamSubjectId, selectedGap: CandidateGap): SecondExamRewriteSeed {
  const templates: Record<GapType, Omit<SecondExamRewriteSeed, "sourceGapId" | "focusLabel" | "gapTitle" | "gapSummary" | "rewriteTarget" | "internalConfidence" | "source">> = {
    "issue-missing": {
      guidanceTitle: "Add the missing point",
      guidance: [
        "State the missing point directly before expanding the paragraph.",
        "Keep one sentence for the missing point and one sentence for the link back.",
        "Do not rewrite the whole answer. Fix this one gap first.",
      ],
      placeholder: "Rewrite the paragraph so the missing point appears clearly and the paragraph still flows.",
      starter: subjectId === "law" ? "On this point, " : "In this answer, ",
      minimumLength: subjectId === "practice" ? 90 : 110,
    },
    "structure-gap": {
      guidanceTitle: "Restore the missing step",
      guidance: [
        "Keep the current material and reconnect the order.",
        "Add the missing step in one short block.",
        "Close the paragraph only after that link is visible.",
      ],
      placeholder: "Rewrite the paragraph so the missing structural step is visible in order.",
      starter: subjectId === "law" ? "Applying this rule to the case, " : "If the reasoning is kept in order, ",
      minimumLength: subjectId === "practice" ? 90 : 120,
    },
    "weak-opening": {
      guidanceTitle: "Tighten the opening",
      guidance: [
        "Fix the issue in the first sentence.",
        "Move background or definition to the next sentence.",
        "Let the paragraph direction appear immediately.",
      ],
      placeholder: "Rewrite the opening sentence so the point appears immediately.",
      starter: subjectId === "theory" ? "The core issue here is " : "In this case, ",
      minimumLength: 90,
    },
    "weak-conclusion": {
      guidanceTitle: "Close the reasoning",
      guidance: [
        "Keep the existing flow.",
        "Add one closing judgment sentence.",
        "Make the last sentence carry the final conclusion.",
      ],
      placeholder: "Rewrite the ending so the answer closes with one clear judgment sentence.",
      starter: subjectId === "practice" ? "Therefore, in this case, " : "Therefore, ",
      minimumLength: subjectId === "practice" ? 80 : 100,
    },
  };

  const template = templates[selectedGap.type];
  const internalConfidence = clampConfidence(selectedGap.confidence - 0.03);

  return {
    sourceGapId: selectedGap.id,
    focusLabel: selectedGap.focusLabel,
    gapTitle: selectedGap.title,
    gapSummary: selectedGap.summary,
    guidanceTitle: template.guidanceTitle,
    guidance: template.guidance,
    rewriteTarget: selectedGap.rewriteTarget,
    placeholder: template.placeholder,
    starter: template.starter,
    minimumLength: template.minimumLength,
    internalConfidence,
    source: "rule",
  };
}

function buildRecordsSummarySeed(
  selectedGap: CandidateGap,
  createdAt: string,
  input: DiagnoseSecondExamInput,
): SecondExamRecordsSummarySeed {
  const repeatCount = (input.compareHistoryCount ?? 0) + (input.rewriteHistoryCount ?? 0);
  const recurringHint =
    repeatCount >= 2 ? `This focus has already appeared in the recent loop. Keep the next entry narrow.` : undefined;

  return {
    focusLabel: selectedGap.focusLabel,
    gapType: selectedGap.type,
    gapTitle: selectedGap.title,
    note:
      selectedGap.type === "weak-opening"
        ? `The answer still needs a firmer first sentence before the rest of the paragraph expands.`
        : selectedGap.type === "weak-conclusion"
          ? `The answer still needs one clearer closing judgment sentence.`
          : selectedGap.type === "structure-gap"
            ? `The answer still needs one missing link in the paragraph order.`
            : `The answer still needs one missing point before the next loop.`,
    nextActionLabel: `Start the next answer by fixing ${selectedGap.rewriteTarget.toLowerCase()}.`,
    recurringHint,
    internalConfidence: clampConfidence(selectedGap.confidence - 0.05),
    createdAt,
  };
}

export function diagnoseSecondExamAnswer(input: DiagnoseSecondExamInput): SecondExamDiagnosisResult {
  const subjectId = isSecondExamSubjectId(input.subjectId) ? input.subjectId : "practice";
  const ruleSet = SUBJECT_RULES[subjectId];
  const createdAt = input.submittedAt ?? new Date().toISOString();
  const normalizedAnswerText = normalizeAnswerText(input.userAnswerText);
  const paragraphs = splitParagraphs(normalizedAnswerText);
  const sentences = splitSentences(paragraphs);
  const issueCoverage = evaluateIssueCoverage(normalizedAnswerText, ruleSet);
  const structureGap = evaluateStructureGap(paragraphs, ruleSet);
  const weakOpening = evaluateWeakOpening(sentences, ruleSet);
  const weakConclusion = evaluateWeakConclusion(sentences, ruleSet);

  const candidates = [
    buildIssueMissingGap(subjectId, issueCoverage),
    buildStructureGapGap(subjectId, structureGap),
    buildWeakOpeningGap(subjectId, weakOpening),
    buildWeakConclusionGap(subjectId, weakConclusion),
  ].filter((candidate): candidate is CandidateGap => !!candidate);

  const fallbackGap = buildFallbackGap(subjectId, ruleSet);
  const selectedGap = selectPrimaryGap(candidates, fallbackGap);
  const rewriteSeed = buildRewriteSeed(subjectId, selectedGap);
  const recordsSummarySeed = buildRecordsSummarySeed(selectedGap, createdAt, input);

  return {
    subjectId,
    normalizedAnswerText,
    paragraphCount: paragraphs.length,
    signals: {
      issueCoverage,
      structureGap,
      weakOpening,
      weakConclusion,
    },
    gapCandidates: candidates,
    selectedGap,
    rewriteSeed,
    recordsSummarySeed,
    internalConfidence: {
      selectedGap: selectedGap.confidence,
      rewriteSeed: rewriteSeed.internalConfidence,
      recordsSummary: recordsSummarySeed.internalConfidence,
    },
  };
}

export function buildSecondExamRecordsSummary(params: {
  subjectId: string;
  diagnoses: SecondExamDiagnosisResult[];
  rewriteCount?: number;
  createdAt?: string;
}): SecondExamRecordsSummarySeed {
  const subjectId = isSecondExamSubjectId(params.subjectId) ? params.subjectId : "practice";
  const createdAt = params.createdAt ?? new Date().toISOString();
  const diagnoses = params.diagnoses.filter((diagnosis) => diagnosis.subjectId === subjectId);

  if (diagnoses.length === 0) {
    const fallback = diagnoseSecondExamAnswer({ subjectId, submittedAt: createdAt });
    return {
      ...fallback.recordsSummarySeed,
      note: `No recent loop is stored yet. The first write will start the record flow.`,
      nextActionLabel: `Start with write.`,
      recurringHint: undefined,
      createdAt,
    };
  }

  const latest = diagnoses[0];
  const frequencies = new Map<GapType, number>();
  diagnoses.forEach((diagnosis) => {
    frequencies.set(diagnosis.selectedGap.type, (frequencies.get(diagnosis.selectedGap.type) ?? 0) + 1);
  });

  const recurringGapType =
    [...frequencies.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? latest.selectedGap.type;
  const recurringCount = frequencies.get(recurringGapType) ?? 1;

  return {
    focusLabel: latest.recordsSummarySeed.focusLabel,
    gapType: recurringGapType,
    gapTitle: latest.recordsSummarySeed.gapTitle,
    note:
      recurringCount >= 2
        ? `Recently, the same correction point keeps returning. Keep the next entry narrower and fix that point first.`
        : latest.recordsSummarySeed.note,
    nextActionLabel:
      params.rewriteCount && params.rewriteCount > 0
        ? `Start the next write with ${latest.selectedGap.rewriteTarget.toLowerCase()}.`
        : `Move from write to compare once, then fix the same point in rewrite.`,
    recurringHint: recurringCount >= 2 ? `Repeated ${recurringCount} times in recent history.` : undefined,
    internalConfidence: clampConfidence(
      diagnoses.reduce((sum, diagnosis) => sum + diagnosis.internalConfidence.recordsSummary, 0) / diagnoses.length,
    ),
    createdAt,
  };
}
