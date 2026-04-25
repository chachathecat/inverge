import "server-only";

import {
  buildRewriteSeedTemplateId,
  getSeedRewriteSeedTemplates,
  isSecondExamAdminSubjectId,
  isSecondExamGapType,
  SECOND_EXAM_ADMIN_SUBJECTS,
  SECOND_EXAM_GAP_TYPES,
  type AdminRewriteSeedTemplate,
  type AdminRewriteSeedTemplateListResponse,
  type AdminRewriteSeedTemplateSaveInput,
} from "@/lib/inverge/admin-rewrite-seed-templates";
import { createJsonFileRepository } from "@/lib/inverge/file-persistence";
import { diagnoseSecondExamAnswer, type GapType, type SecondExamSubjectId } from "@/lib/inverge/second-exam-diagnosis";

type PersistedRewriteSeedTemplateStore = {
  templates: AdminRewriteSeedTemplate[];
};

type RewriteSeedTemplateRepository = {
  list(filters?: { subjectId?: string; gapType?: string }): AdminRewriteSeedTemplateListResponse;
  findActive(filters: {
    subjectId: SecondExamSubjectId;
    gapType: GapType;
    focusLabel?: string;
  }): AdminRewriteSeedTemplate | null;
  save(input: AdminRewriteSeedTemplateSaveInput): { template: AdminRewriteSeedTemplate; list: AdminRewriteSeedTemplateListResponse };
  setActive(input: {
    id: string;
    active: boolean;
    subjectId?: SecondExamSubjectId;
    gapType?: GapType;
  }): { template: AdminRewriteSeedTemplate; list: AdminRewriteSeedTemplateListResponse };
};

const store = createJsonFileRepository<PersistedRewriteSeedTemplateStore>("admin-rewrite-seed-templates.json", () => ({
  templates: getSeedRewriteSeedTemplates(),
}));

function normalizeTemplate(template: AdminRewriteSeedTemplate): AdminRewriteSeedTemplate {
  const diagnosis = diagnoseSecondExamAnswer({ subjectId: template.subjectId });

  return {
    ...template,
    gapTitle: template.gapTitle?.trim() || diagnosis.selectedGap.title,
    gapSummary: template.gapSummary?.trim() || diagnosis.selectedGap.summary,
    rewriteInstruction: template.rewriteInstruction?.trim() || diagnosis.selectedGap.rewriteInstruction,
  };
}

function readTemplates() {
  const data = store.read();
  const templates = data.templates.map(normalizeTemplate);

  if (templates.some((template, index) => template !== data.templates[index])) {
    store.write({ templates });
  }

  return templates;
}

function sortTemplates(templates: AdminRewriteSeedTemplate[]) {
  const subjectOrder = new Map(SECOND_EXAM_ADMIN_SUBJECTS.map((subject, index) => [subject.id, index]));
  const gapOrder = new Map(SECOND_EXAM_GAP_TYPES.map((gapType, index) => [gapType, index]));

  return [...templates].sort((a, b) => {
    const subjectDelta = (subjectOrder.get(a.subjectId) ?? 99) - (subjectOrder.get(b.subjectId) ?? 99);
    if (subjectDelta !== 0) return subjectDelta;
    return (gapOrder.get(a.gapType) ?? 99) - (gapOrder.get(b.gapType) ?? 99);
  });
}

function buildResponse(templates: AdminRewriteSeedTemplate[]): AdminRewriteSeedTemplateListResponse {
  const sortedTemplates = sortTemplates(templates);
  const activeCount = sortedTemplates.filter((template) => template.active).length;

  return {
    subjects: SECOND_EXAM_ADMIN_SUBJECTS,
    gapTypes: SECOND_EXAM_GAP_TYPES,
    templates: sortedTemplates,
    summary: {
      totalCount: sortedTemplates.length,
      activeCount,
      inactiveCount: sortedTemplates.length - activeCount,
    },
  };
}

const repository: RewriteSeedTemplateRepository = {
  list(filters) {
    const templates = readTemplates().filter((template) => {
      if (filters?.subjectId && isSecondExamAdminSubjectId(filters.subjectId) && template.subjectId !== filters.subjectId) {
        return false;
      }
      if (filters?.gapType && isSecondExamGapType(filters.gapType) && template.gapType !== filters.gapType) {
        return false;
      }
      return true;
    });

    return buildResponse(templates);
  },

  save(input) {
    return store.update((data) => {
      if (!isSecondExamAdminSubjectId(input.subjectId)) {
        throw new Error("invalid-subject");
      }
      if (!isSecondExamGapType(input.gapType)) {
        throw new Error("invalid-gap-type");
      }

      const id = input.id || buildRewriteSeedTemplateId(input.subjectId, input.gapType);
      const existing = data.templates.find((template) => template.id === id);
      const now = new Date().toISOString();
      const guidance = input.guidance.map((item) => item.trim()).filter(Boolean).slice(0, 5);

      if (
        !input.focusLabel.trim() ||
        !input.gapTitle.trim() ||
        !input.gapSummary.trim() ||
        !input.rewriteInstruction.trim() ||
        !input.placeholder.trim() ||
        !input.starter.trim() ||
        guidance.length === 0
      ) {
        throw new Error("missing-required-field");
      }

      const template: AdminRewriteSeedTemplate = {
        id,
        subjectId: input.subjectId,
        gapType: input.gapType,
        focusLabel: input.focusLabel.trim(),
        gapTitle: input.gapTitle.trim(),
        gapSummary: input.gapSummary.trim(),
        rewriteInstruction: input.rewriteInstruction.trim(),
        guidanceTitle: input.guidanceTitle.trim() || "Correction guide",
        guidance,
        placeholder: input.placeholder.trim(),
        starter: input.starter,
        minimumLength: Math.max(40, Math.min(Number(input.minimumLength) || 80, 400)),
        active: input.active,
        operatorNote: input.operatorNote?.trim(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      const nextTemplates = existing
        ? data.templates.map((item) => (item.id === id ? template : item))
        : [...data.templates, template];
      const next = { templates: nextTemplates };

      return {
        next,
        result: {
          template,
          list: buildResponse(nextTemplates.filter((item) => item.subjectId === template.subjectId)),
        },
      };
    });
  },

  findActive(filters) {
    const templates = readTemplates();
    const exactFocusMatch = templates.find(
      (template) =>
        template.active &&
        template.subjectId === filters.subjectId &&
        template.gapType === filters.gapType &&
        template.focusLabel === filters.focusLabel,
    );

    if (exactFocusMatch) {
      return exactFocusMatch;
    }

    return (
      templates.find(
        (template) =>
          template.active && template.subjectId === filters.subjectId && template.gapType === filters.gapType,
      ) ?? null
    );
  },

  setActive(input) {
    const current = readTemplates().find((template) => template.id === input.id);
    if (!current) {
      throw new Error("template-not-found");
    }

    const template = repository.save({ ...current, active: input.active }).template;
    return {
      template,
      list: repository.list({
        subjectId: input.subjectId ?? template.subjectId,
        gapType: input.gapType,
      }),
    };
  },
};

export async function listAdminRewriteSeedTemplates(filters?: { subjectId?: string; gapType?: string }) {
  return repository.list(filters);
}

export async function saveAdminRewriteSeedTemplate(input: AdminRewriteSeedTemplateSaveInput) {
  return repository.save(input);
}

export async function findActiveAdminRewriteSeedTemplate(filters: {
  subjectId: SecondExamSubjectId;
  gapType: GapType;
  focusLabel?: string;
}) {
  return repository.findActive(filters);
}

export async function setAdminRewriteSeedTemplateActive(input: {
  id: string;
  active: boolean;
  subjectId?: SecondExamSubjectId;
  gapType?: GapType;
}) {
  return repository.setActive(input);
}
