import "server-only";

import { findActiveAdminRewriteSeedTemplate } from "@/lib/inverge/admin-rewrite-seed-template-repository";
import {
  toSecondExamSeedTemplateOverride,
  type SecondExamSeedTemplateLookupInput,
} from "@/lib/inverge/second-exam-seed-template";

export async function lookupSecondExamSeedTemplate(input: SecondExamSeedTemplateLookupInput) {
  const template = await findActiveAdminRewriteSeedTemplate(input);
  if (!template) return null;

  return toSecondExamSeedTemplateOverride(template);
}
