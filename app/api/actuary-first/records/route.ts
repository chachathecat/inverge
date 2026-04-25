import { actuaryFirstService } from "@/lib/actuary-first/service";
import { getActuaryMvpUserId, jsonOk, jsonRouteError, parseActuarySubjectId } from "@/lib/actuary-first/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const subjectId = parseActuarySubjectId(url.searchParams.get("subjectId"));
    return jsonOk(await actuaryFirstService.getRecords(subjectId, await getActuaryMvpUserId(request)));
  } catch (error) {
    return jsonRouteError(error, "actuary-records-fetch-error", 500);
  }
}
