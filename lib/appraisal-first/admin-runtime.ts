import "server-only";

import type { CivilLawCurriculumMapping, RootCauseTagDefinition, RootCauseTagId } from "@/lib/appraisal-first/types";
import { CIVIL_LAW_CURRICULUM_MAPPINGS } from "@/lib/appraisal-first/civil-law/curriculum";
import { LEGAL_REGULATIONS_CURRICULUM_MAPPINGS, type LegalRegulationsCurriculumMapping } from "@/lib/appraisal-first/legal-regulations/curriculum";
import { CIVIL_LAW_ROOT_CAUSE_TAGS } from "@/lib/appraisal-first/civil-law/root-cause-tags";
import { LEGAL_REGULATIONS_ROOT_CAUSE_TAGS } from "@/lib/appraisal-first/legal-regulations/root-cause-tags";
import { listAdminCurriculumMappings } from "@/lib/inverge/admin-curriculum-repository";
import { toDiagnosisCurriculumMappings } from "@/lib/inverge/admin-curriculum";
import { listAdminRootCauseTags } from "@/lib/inverge/admin-root-cause-tags-repository";
import { toDiagnosisRootCauseTags } from "@/lib/inverge/admin-root-cause-tags";

function buildRootCauseLookup(tags: RootCauseTagDefinition[]) {
  return new Map(tags.map((tag) => [tag.tagId, tag]));
}

export function getRuntimeCivilLawCurriculumMappings(): CivilLawCurriculumMapping[] {
  const adminMappings = toDiagnosisCurriculumMappings(listAdminCurriculumMappings("civil_law").mappings);
  return adminMappings.length > 0 ? adminMappings : CIVIL_LAW_CURRICULUM_MAPPINGS;
}

export function getRuntimeLegalRegulationsCurriculumMappings(): LegalRegulationsCurriculumMapping[] {
  const adminMappings = listAdminCurriculumMappings("appraisal_law").mappings.filter(
    (mapping) => mapping.active,
  ) as unknown as LegalRegulationsCurriculumMapping[];
  return adminMappings.length > 0 ? adminMappings : LEGAL_REGULATIONS_CURRICULUM_MAPPINGS;
}

export function getRuntimeCivilLawRootCauseTags(): RootCauseTagDefinition[] {
  const adminTags = toDiagnosisRootCauseTags(listAdminRootCauseTags("civil_law").tags);
  return adminTags.length > 0 ? adminTags : CIVIL_LAW_ROOT_CAUSE_TAGS;
}

export function getRuntimeLegalRegulationsRootCauseTags(): RootCauseTagDefinition[] {
  const adminTags = toDiagnosisRootCauseTags(listAdminRootCauseTags("appraisal_law").tags);
  return adminTags.length > 0 ? adminTags : LEGAL_REGULATIONS_ROOT_CAUSE_TAGS;
}

export function getRuntimeCivilLawRootCauseTag(tagId: RootCauseTagId) {
  const lookup = buildRootCauseLookup(getRuntimeCivilLawRootCauseTags());
  return lookup.get(tagId) ?? getRuntimeCivilLawRootCauseTags()[0];
}

export function getRuntimeLegalRegulationsRootCauseTag(tagId: RootCauseTagId) {
  const lookup = buildRootCauseLookup(getRuntimeLegalRegulationsRootCauseTags());
  return lookup.get(tagId) ?? getRuntimeLegalRegulationsRootCauseTags()[0];
}
