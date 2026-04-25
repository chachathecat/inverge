import { runActuarySecondCalibrationFixtures } from "@/lib/actuary-second/calibration";
import { jsonOk } from "@/lib/actuary-second/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOk(runActuarySecondCalibrationFixtures());
}
