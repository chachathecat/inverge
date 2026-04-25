import type {
  CandidateGap,
  SecondExamDiagnosisResult,
  SecondExamRecordsSummarySeed,
  SecondExamRewriteSeed,
  SecondExamSubjectId,
} from "@/lib/inverge/second-exam-diagnosis";

export type SecondExamAiTask = "compare-copy" | "rewrite-seed-copy" | "records-summary-copy";

export type SecondExamAiInput = {
  task: SecondExamAiTask;
  productContext: {
    productName: "Inverge";
    examId: string;
    subjectId: SecondExamSubjectId;
    screen: "compare" | "rewrite" | "records";
    principle: "one-primary-action";
  };
  ruleResult: {
    selectedGapId: string;
    selectedGapType: CandidateGap["type"];
    focusLabel: string;
    rewriteTarget: string;
    confidence: number;
    severity: CandidateGap["severity"];
    rewriteImpact: CandidateGap["rewriteImpact"];
  };
  evidence: {
    userExcerpt: string[];
    ruleEvidence: string[];
  };
  existingSeed: {
    gapTitle: string;
    gapSummary: string;
    rewriteInstruction?: string;
    guidance?: string[];
    placeholder?: string;
    starter?: string;
    recordsNote?: string;
    nextActionLabel?: string;
  };
  outputLimits: {
    maxGapTitleChars: number;
    maxSummarySentences: number;
    maxGuidanceItems: number;
    maxGuidanceCharsEach: number;
  };
};

export type SecondExamAiOutput = {
  status: "ok" | "insufficient-evidence" | "error";
  publicText: {
    gapTitle?: string;
    gapSummary?: string;
    rewriteInstruction?: string;
    guidance?: string[];
    placeholder?: string;
    starter?: string;
    recordsNote?: string;
    nextActionLabel?: string;
  };
  internal: {
    usedEvidenceIds: string[];
    confidenceAdjustment: -0.1 | 0 | 0.1;
    safetyFlags: string[];
  };
};

export type SecondExamAiAdapter = {
  refineCompareCopy(input: SecondExamAiInput): Promise<SecondExamAiOutput>;
  refineRewriteSeed(input: SecondExamAiInput): Promise<SecondExamAiOutput>;
  refineRecordsSummary(input: SecondExamAiInput): Promise<SecondExamAiOutput>;
};

type BuildAiInputOptions = {
  examId: string;
  subjectId: SecondExamSubjectId;
  diagnosis: SecondExamDiagnosisResult;
};

export function buildCompareAiInput({ examId, subjectId, diagnosis }: BuildAiInputOptions): SecondExamAiInput {
  const gap = diagnosis.selectedGap;

  return {
    task: "compare-copy",
    productContext: {
      productName: "Inverge",
      examId,
      subjectId,
      screen: "compare",
      principle: "one-primary-action",
    },
    ruleResult: {
      selectedGapId: gap.id,
      selectedGapType: gap.type,
      focusLabel: gap.focusLabel,
      rewriteTarget: gap.rewriteTarget,
      confidence: gap.confidence,
      severity: gap.severity,
      rewriteImpact: gap.rewriteImpact,
    },
    evidence: {
      userExcerpt: gap.evidence.slice(0, 2),
      ruleEvidence: gap.evidence,
    },
    existingSeed: {
      gapTitle: gap.title,
      gapSummary: gap.summary,
      rewriteInstruction: gap.rewriteInstruction,
    },
    outputLimits: {
      maxGapTitleChars: 60,
      maxSummarySentences: 2,
      maxGuidanceItems: 0,
      maxGuidanceCharsEach: 0,
    },
  };
}

export function buildRewriteSeedAiInput({ examId, subjectId, diagnosis }: BuildAiInputOptions): SecondExamAiInput {
  const gap = diagnosis.selectedGap;
  const seed = diagnosis.rewriteSeed;

  return {
    task: "rewrite-seed-copy",
    productContext: {
      productName: "Inverge",
      examId,
      subjectId,
      screen: "rewrite",
      principle: "one-primary-action",
    },
    ruleResult: {
      selectedGapId: gap.id,
      selectedGapType: gap.type,
      focusLabel: gap.focusLabel,
      rewriteTarget: gap.rewriteTarget,
      confidence: gap.confidence,
      severity: gap.severity,
      rewriteImpact: gap.rewriteImpact,
    },
    evidence: {
      userExcerpt: gap.evidence.slice(0, 2),
      ruleEvidence: gap.evidence,
    },
    existingSeed: {
      gapTitle: seed.gapTitle,
      gapSummary: seed.gapSummary,
      guidance: seed.guidance,
      placeholder: seed.placeholder,
      starter: seed.starter,
    },
    outputLimits: {
      maxGapTitleChars: 60,
      maxSummarySentences: 2,
      maxGuidanceItems: 3,
      maxGuidanceCharsEach: 38,
    },
  };
}

export function buildRecordsSummaryAiInput({
  examId,
  subjectId,
  diagnosis,
  recordsSummarySeed,
}: BuildAiInputOptions & {
  recordsSummarySeed: SecondExamRecordsSummarySeed;
}): SecondExamAiInput {
  const gap = diagnosis.selectedGap;

  return {
    task: "records-summary-copy",
    productContext: {
      productName: "Inverge",
      examId,
      subjectId,
      screen: "records",
      principle: "one-primary-action",
    },
    ruleResult: {
      selectedGapId: gap.id,
      selectedGapType: gap.type,
      focusLabel: gap.focusLabel,
      rewriteTarget: gap.rewriteTarget,
      confidence: gap.confidence,
      severity: gap.severity,
      rewriteImpact: gap.rewriteImpact,
    },
    evidence: {
      userExcerpt: gap.evidence.slice(0, 2),
      ruleEvidence: gap.evidence,
    },
    existingSeed: {
      gapTitle: recordsSummarySeed.gapTitle,
      gapSummary: diagnosis.selectedGap.summary,
      recordsNote: recordsSummarySeed.note,
      nextActionLabel: recordsSummarySeed.nextActionLabel,
    },
    outputLimits: {
      maxGapTitleChars: 60,
      maxSummarySentences: 2,
      maxGuidanceItems: 0,
      maxGuidanceCharsEach: 0,
    },
  };
}

function ok(publicText: SecondExamAiOutput["publicText"], evidenceCount: number): SecondExamAiOutput {
  return {
    status: evidenceCount > 0 ? "ok" : "insufficient-evidence",
    publicText,
    internal: {
      usedEvidenceIds: evidenceCount > 0 ? ["rule-evidence-0"] : [],
      confidenceAdjustment: 0,
      safetyFlags: [],
    },
  };
}

export const mockSecondExamAiAdapter: SecondExamAiAdapter = {
  async refineCompareCopy(input) {
    const subjectId = input.productContext.subjectId;
    const evidenceCount = input.evidence.ruleEvidence.length;

    if (subjectId === "theory") {
      return ok(
        {
          gapTitle: "첫 문장에서 논점이 늦게 보입니다.",
          gapSummary: "이번에는 내용을 늘리기보다 첫 문장을 논점 선언으로 고정하는 것이 우선입니다.",
          rewriteInstruction: "첫 문장을 바꾸고 근거는 다음 문장에 붙여 보세요.",
        },
        evidenceCount,
      );
    }

    if (subjectId === "law") {
      return ok(
        {
          gapTitle: "조문 다음의 사안 적용이 약합니다.",
          gapSummary: "조문보다 그 조문이 현재 결론을 어떻게 지지하는지가 더 분명해야 합니다.",
          rewriteInstruction: "조문 인용 뒤에 사안 적용 문장을 붙여 보세요.",
        },
        evidenceCount,
      );
    }

    return ok(
      {
        gapTitle: "계산 결과가 판단으로 이어지지 않았습니다.",
        gapSummary: "계산을 더 늘리기보다 마지막 문장에서 평가 판단을 고정하는 것이 우선입니다.",
        rewriteInstruction: "계산 결과 뒤에 결론 문장 하나를 붙여 보세요.",
      },
      evidenceCount,
    );
  },

  async refineRewriteSeed(input) {
    const subjectId = input.productContext.subjectId;
    const evidenceCount = input.evidence.ruleEvidence.length;

    if (subjectId === "theory") {
      return ok(
        {
          guidance: ["첫 문장을 논점 선언으로 바꿉니다.", "정의는 두 번째 문장으로 미룹니다.", "문단 방향이 첫 줄에서 보이게 합니다."],
          placeholder: "첫 문장에서 논점이 보이도록 해당 문단을 다시 작성해 주세요.",
          starter: "이 사안의 핵심 논점은 ",
        },
        evidenceCount,
      );
    }

    if (subjectId === "law") {
      return ok(
        {
          guidance: ["조문 인용은 짧게 둡니다.", "다음 문장에서 바로 사안에 적용합니다.", "요건과 결론을 한 흐름으로 이어 씁니다."],
          placeholder: "조문 다음에 사안 적용 문장이 바로 이어지도록 다시 작성해 주세요.",
          starter: "위 조문을 본 사안에 적용하면 ",
        },
        evidenceCount,
      );
    }

    return ok(
      {
        guidance: ["계산 흐름은 그대로 둡니다.", "마지막 문단에 판단 문장을 붙입니다.", "평가 기준으로 마무리합니다."],
        placeholder: "계산 결과가 최종 판단으로 이어지도록 해당 문단을 다시 작성해 주세요.",
        starter: "따라서 본 사안에서는 ",
      },
      evidenceCount,
    );
  },

  async refineRecordsSummary(input) {
    const subjectId = input.productContext.subjectId;
    const evidenceCount = input.evidence.ruleEvidence.length;

    if (subjectId === "theory") {
      return ok(
        {
          recordsNote: "The same opening issue is still returning. Keep the first sentence narrower in the next loop.",
          nextActionLabel: "Start the next answer by fixing the first sentence before adding detail.",
        },
        evidenceCount,
      );
    }

    if (subjectId === "law") {
      return ok(
        {
          recordsNote: "The same rule-to-case link is still thin. Re-enter from one case-application sentence.",
          nextActionLabel: "Start the next answer by adding the case application right after the rule.",
        },
        evidenceCount,
      );
    }

    return ok(
      {
        recordsNote: "The same closing issue is still returning. Re-enter from one firmer judgment sentence.",
        nextActionLabel: "Start the next answer by fixing the last sentence first.",
      },
      evidenceCount,
    );
  },
};

export function isValidSecondExamAiOutput(output: SecondExamAiOutput) {
  if (output.status !== "ok") return false;
  if (output.internal.safetyFlags.length > 0) return false;
  return true;
}

export function applyCompareAiOutput(gap: CandidateGap, output: SecondExamAiOutput): CandidateGap {
  if (!isValidSecondExamAiOutput(output)) return gap;

  return {
    ...gap,
    title: output.publicText.gapTitle ?? gap.title,
    summary: output.publicText.gapSummary ?? gap.summary,
    rewriteInstruction: output.publicText.rewriteInstruction ?? gap.rewriteInstruction,
  };
}

export function applyRewriteSeedAiOutput(seed: SecondExamRewriteSeed, output: SecondExamAiOutput): SecondExamRewriteSeed {
  if (!isValidSecondExamAiOutput(output)) return seed;

  return {
    ...seed,
    guidance: output.publicText.guidance?.slice(0, 3) ?? seed.guidance,
    placeholder: output.publicText.placeholder ?? seed.placeholder,
    starter: output.publicText.starter ?? seed.starter,
  };
}

export function applyRecordsAiOutput(seed: SecondExamRecordsSummarySeed, output: SecondExamAiOutput): SecondExamRecordsSummarySeed {
  if (!isValidSecondExamAiOutput(output)) return seed;

  return {
    ...seed,
    note: output.publicText.recordsNote ?? seed.note,
    nextActionLabel: output.publicText.nextActionLabel ?? seed.nextActionLabel,
  };
}
