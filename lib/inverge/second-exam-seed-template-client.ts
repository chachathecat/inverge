"use client";

import { useEffect, useState } from "react";

import type { GapType, SecondExamSubjectId } from "@/lib/inverge/second-exam-diagnosis";
import type { SecondExamSeedTemplateOverride } from "@/lib/inverge/second-exam-seed-template";

type SeedTemplateLookupResponse = {
  ok: boolean;
  template: SecondExamSeedTemplateOverride | null;
};

async function fetchSecondExamSeedTemplate(input: {
  subjectId: SecondExamSubjectId;
  gapType: GapType;
  focusLabel?: string;
}) {
  const params = new URLSearchParams({
    subjectId: input.subjectId,
    gapType: input.gapType,
  });

  if (input.focusLabel) {
    params.set("focusLabel", input.focusLabel);
  }

  const response = await fetch(`/api/inverge/second-exam/seed-template?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("seed-template-lookup-failed");
  }

  const result = (await response.json()) as SeedTemplateLookupResponse;
  return result.template ?? null;
}

export function useSecondExamSeedTemplate(input: {
  subjectId: SecondExamSubjectId;
  gapType: GapType;
  focusLabel?: string;
}) {
  const { subjectId, gapType, focusLabel } = input;
  const [template, setTemplate] = useState<SecondExamSeedTemplateOverride | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplate() {
      try {
        const nextTemplate = await fetchSecondExamSeedTemplate({ subjectId, gapType, focusLabel });
        if (!cancelled) {
          setTemplate(nextTemplate);
        }
      } catch {
        if (!cancelled) {
          setTemplate(null);
        }
      }
    }

    void loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [focusLabel, gapType, subjectId]);

  return template;
}
