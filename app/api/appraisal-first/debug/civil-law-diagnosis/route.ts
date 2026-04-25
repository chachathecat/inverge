import { jsonError, jsonOk } from "@/lib/appraisal-first/http";
import {
  CIVIL_LAW_DIAGNOSIS_SCENARIO_IDS,
  type CivilLawDiagnosisScenarioId,
} from "@/lib/appraisal-first/civil-law/test-fixtures";
import {
  runAllCivilLawDiagnosisScenarios,
  runCivilLawDiagnosisScenario,
} from "@/lib/appraisal-first/civil-law/debug-diagnosis";

export const dynamic = "force-dynamic";

function isScenarioId(value: string | null): value is CivilLawDiagnosisScenarioId {
  return CIVIL_LAW_DIAGNOSIS_SCENARIO_IDS.includes(value as CivilLawDiagnosisScenarioId);
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return jsonError("Debug route is disabled in production", 404);
  }

  const url = new URL(request.url);
  const scenario = url.searchParams.get("scenario");

  if (!scenario || scenario === "all") {
    return jsonOk(runAllCivilLawDiagnosisScenarios());
  }

  if (!isScenarioId(scenario)) {
    return jsonError(`Unknown scenario: ${scenario}`, 404);
  }

  return jsonOk(runCivilLawDiagnosisScenario(scenario));
}
