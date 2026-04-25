import { appraisalFirstService } from "@/lib/appraisal-first/service";
import { getMvpUserId, jsonError, jsonOk, jsonRouteError, parseSubjectId } from "@/lib/appraisal-first/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ subjectId: string }> }) {
  try {
    const { subjectId: rawSubjectId } = await params;
    const subjectId = parseSubjectId(rawSubjectId);

    if (!subjectId) {
      return jsonError("Unknown subjectId", 404);
    }

    return jsonOk(await appraisalFirstService.getSubjectSummary(subjectId, await getMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "subject-summary-fetch-error", 500);
  }
}
