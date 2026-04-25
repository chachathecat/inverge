import { appraisalFirstService } from "@/lib/appraisal-first/service";
import { getMvpUserId, jsonOk, jsonRouteError, parseSubjectId } from "@/lib/appraisal-first/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const subjectId = parseSubjectId(url.searchParams.get("subjectId"));
    return jsonOk(await appraisalFirstService.getRecords(subjectId, await getMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "records-fetch-error", 500);
  }
}
