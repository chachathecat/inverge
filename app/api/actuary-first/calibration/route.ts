import { jsonOk } from "@/lib/actuary-first/http";
import { runProbabilityCalibrationFixtures } from "@/lib/actuary-first/calibration";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOk(runProbabilityCalibrationFixtures());
}
