import { isRouteResponse, getNotificationRouteContext, notificationApiErrorResponse } from "@/lib/notifications/route-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const context = await getNotificationRouteContext(request);
    if (isRouteResponse(context)) return context;
    const body = (await request.json().catch(() => ({}))) as { endpoint?: unknown };
    const now = new Date().toISOString();
    let query = context.client
      .from("push_subscriptions")
      .update({ enabled: false, revoked_at: now, updated_at: now })
      .eq("user_id", context.userId)
      .eq("enabled", true);
    if (typeof body.endpoint === "string" && body.endpoint.length > 0) {
      query = query.eq("endpoint", body.endpoint);
    }
    const result = await query.select("id");
    if (result.error) throw new Error(`notification-unsubscribe-failed:${result.error.code ?? "unknown"}`);
    return context.json({ ok: true, status: "unsubscribed", revokedCount: result.data?.length ?? 0 });
  } catch (error) {
    return notificationApiErrorResponse(error);
  }
}
