import "server-only";

import {
  buildAdminAiReviewItem,
  buildAdminAiReviewListResponse,
  type AdminAiReviewItem,
  type RecordAdminAiReviewInput,
} from "@/lib/inverge/admin-ai-review";
import { createJsonFileRepository } from "@/lib/inverge/file-persistence";
import type { SecondExamAiInput, SecondExamAiOutput } from "@/lib/inverge/second-exam-ai";

type PersistedAdminAiReviewStore = {
  items: AdminAiReviewItem[];
};

type AdminAiReviewRepository = {
  list(filters?: { screen?: string }): ReturnType<typeof buildAdminAiReviewListResponse>;
  saveNote(input: { id: string; reviewerNote: string; needsReview?: boolean; flagged?: boolean }): {
    item: AdminAiReviewItem;
    list: ReturnType<typeof buildAdminAiReviewListResponse>;
  };
  record(input: RecordAdminAiReviewInput): AdminAiReviewItem;
};

function seedInput(task: "compare-copy" | "rewrite-seed-copy", screen: "compare" | "rewrite"): SecondExamAiInput {
  return {
    task,
    productContext: {
      productName: "Inverge",
      examId: "appraiser-second",
      subjectId: screen === "rewrite" ? "theory" : "practice",
      screen,
      principle: "one-primary-action",
    },
    ruleResult: {
      selectedGapId: screen === "rewrite" ? "theory-weak-opening" : "practice-weak-conclusion",
      selectedGapType: screen === "rewrite" ? "weak-opening" : "weak-conclusion",
      focusLabel: screen === "rewrite" ? "Opening focus" : "Conclusion link",
      rewriteTarget: screen === "rewrite" ? "first sentence" : "final paragraph",
      confidence: 0.78,
      severity: 3,
      rewriteImpact: 3,
    },
    evidence: {
      userExcerpt: ["Sample evidence"],
      ruleEvidence: ["Sample evidence"],
    },
    existingSeed: {
      gapTitle: screen === "rewrite" ? "The first sentence does not declare the issue." : "The calculation result does not close as a judgment.",
      gapSummary: screen === "rewrite" ? "The direction is delayed." : "The conclusion is not fixed at the end.",
      rewriteInstruction: screen === "compare" ? "Attach one judgment sentence." : undefined,
      guidance: screen === "rewrite" ? ["State the issue first.", "Move the definition later.", "Show the paragraph direction early."] : undefined,
      placeholder: screen === "rewrite" ? "Rewrite the paragraph with a clearer first sentence." : undefined,
      starter: screen === "rewrite" ? "The core issue in this case is " : undefined,
    },
    outputLimits: {
      maxGapTitleChars: 60,
      maxSummarySentences: 2,
      maxGuidanceItems: 3,
      maxGuidanceCharsEach: 38,
    },
  };
}

function seedOutput(screen: "compare" | "rewrite", flagged = false): SecondExamAiOutput {
  if (screen === "compare") {
    return {
      status: flagged ? "error" : "ok",
      publicText: flagged
        ? {}
        : {
            gapTitle: "The closing judgment stays weak.",
            gapSummary: "Keep the calculation flow and fix the last sentence first.",
            rewriteInstruction: "Add one judgment sentence at the end.",
          },
      internal: {
        usedEvidenceIds: ["rule-evidence-0"],
        confidenceAdjustment: 0,
        safetyFlags: flagged ? ["forbidden-expression"] : [],
      },
    };
  }

  return {
    status: flagged ? "error" : "ok",
    publicText: flagged
      ? {}
      : {
          guidance: ["State the issue in sentence one.", "Move the definition after that.", "Keep the paragraph direction visible."],
          placeholder: "Rewrite only this paragraph around the opening sentence.",
          starter: "The core issue in this case is ",
        },
    internal: {
      usedEvidenceIds: ["rule-evidence-0"],
      confidenceAdjustment: 0,
      safetyFlags: flagged ? ["evidence-drift"] : [],
    },
  };
}

function buildSeedItems() {
  const okCompare = buildAdminAiReviewItem({
    input: seedInput("compare-copy", "compare"),
    output: seedOutput("compare"),
    meta: { provider: "mock", fallbackUsed: false },
  });
  const fallbackRewrite = buildAdminAiReviewItem({
    input: seedInput("rewrite-seed-copy", "rewrite"),
    output: seedOutput("rewrite", true),
    meta: { provider: "openai", fallbackUsed: true, errorReason: "evidence-drift" },
    validationFailureCodes: ["evidence-drift"],
  });

  fallbackRewrite.reviewerNote = "Opening guidance drifted beyond the current evidence. Keep the rewrite scope narrower.";
  fallbackRewrite.reviewedAt = new Date("2026-04-21T08:10:00.000Z").toISOString();

  return [okCompare, fallbackRewrite];
}

const store = createJsonFileRepository<PersistedAdminAiReviewStore>("admin-ai-review-items.json", () => ({
  items: buildSeedItems(),
}));

function sortItems(items: AdminAiReviewItem[]) {
  return [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

const repository: AdminAiReviewRepository = {
  list(filters) {
    const items = sortItems(store.read().items).filter((item) => {
      if (filters?.screen && (filters.screen === "compare" || filters.screen === "rewrite")) {
        return item.screen === filters.screen;
      }

      return true;
    });

    return buildAdminAiReviewListResponse(items);
  },

  saveNote(input) {
    return store.update((data) => {
      const item = data.items.find((entry) => entry.id === input.id);
      if (!item) {
        throw new Error("ai-review-item-not-found");
      }

      const nextItem: AdminAiReviewItem = {
        ...item,
        reviewerNote: input.reviewerNote.trim(),
        reviewedAt: new Date().toISOString(),
        needsReview: input.needsReview ?? item.needsReview,
        flagged: input.flagged ?? item.flagged,
      };
      const nextItems = data.items.map((entry) => (entry.id === input.id ? nextItem : entry));

      return {
        next: { items: nextItems },
        result: {
          item: nextItem,
          list: buildAdminAiReviewListResponse(sortItems(nextItems)),
        },
      };
    });
  },

  record(input) {
    return store.update((data) => {
      const item = buildAdminAiReviewItem(input);
      return {
        next: { items: [item, ...data.items].slice(0, 500) },
        result: item,
      };
    });
  },
};

export async function listAdminAiReviewItems(filters?: { screen?: string }) {
  return repository.list(filters);
}

export async function saveAdminAiReviewNote(input: { id: string; reviewerNote: string; needsReview?: boolean; flagged?: boolean }) {
  return repository.saveNote(input);
}

export async function recordAdminAiReviewItem(input: RecordAdminAiReviewInput) {
  return repository.record(input);
}
