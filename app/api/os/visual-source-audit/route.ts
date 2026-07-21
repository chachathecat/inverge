import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const AUDIT_ROW_LIMIT = 501;
const AUDIT_SHA_HEADER = "x-s232h2-audit-sha";
const AGENDA_USAGE_EVENT_NAMES = [
  "capture_saved",
  "post_save_execution_started",
  "post_save_execution_completed",
  "review_followup_scheduled",
  "today_task_completed",
  "today_plan_task_completed",
  "review_complete",
  "review_completed",
  "review_queue_task_completed",
  "overdue_recovery_completed",
  "weakness_recovered",
] as const;

type AuditRow = Record<string, unknown>;
type ReadResult = {
  data: unknown;
  error: unknown;
};

function unavailable() {
  return new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function readFailed() {
  return new NextResponse(null, {
    status: 500,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function auditJson(body: unknown) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

function rowsFrom(result: ReadResult): AuditRow[] {
  if (result.error || !Array.isArray(result.data)) {
    throw new Error("visual-source-audit-read-failed");
  }
  return result.data as AuditRow[];
}

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return unavailable();
  }

  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (
    !deploymentSha ||
    request.headers.get(AUDIT_SHA_HEADER) !== deploymentSha
  ) {
    return unavailable();
  }

  const supabase = await createSupabaseServerClient().catch(() => null);
  if (!supabase) {
    return unavailable();
  }

  const authResult = await supabase.auth.getUser().catch(() => null);
  const sessionUser = authResult?.data.user;
  if (authResult?.error || !sessionUser?.id) {
    return unavailable();
  }

  const probeItemId = new URL(request.url).searchParams.get("probeItemId");
  if (probeItemId !== null) {
    try {
      const probeResult = await supabase
        .from("wrong_answer_items")
        .select("id")
        .eq("id", probeItemId)
        .limit(1);

      if (probeResult.error) {
        return readFailed();
      }

      return auditJson({
        ok: true,
        rlsProbeVisible: (probeResult.data ?? []).length > 0,
      });
    } catch {
      return readFailed();
    }
  }

  try {
    const [
      itemsResult,
      notesResult,
      tagsResult,
      recurrenceResult,
      reviewQueueResult,
      studyLogsResult,
      weeklySummariesResult,
      learningSignalsResult,
      agendaUsageResult,
      todaySeedsResult,
      studyProfilesResult,
      conceptNodesResult,
    ] = await Promise.all([
      supabase
        .from("wrong_answer_items")
        .select("*")
        .eq("user_id", sessionUser.id)
        .order("created_at", { ascending: false })
        .limit(AUDIT_ROW_LIMIT),
      supabase
        .from("wrong_answer_notes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(AUDIT_ROW_LIMIT),
      supabase
        .from("wrong_answer_tags")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(AUDIT_ROW_LIMIT),
      supabase
        .from("recurrence_features")
        .select("*")
        .eq("user_id", sessionUser.id)
        .order("created_at", { ascending: false })
        .limit(AUDIT_ROW_LIMIT),
      supabase
        .from("review_queue_items")
        .select("*")
        .eq("user_id", sessionUser.id)
        .order("created_at", { ascending: false })
        .limit(AUDIT_ROW_LIMIT),
      supabase
        .from("study_logs")
        .select("*")
        .eq("user_id", sessionUser.id)
        .order("created_at", { ascending: false })
        .limit(AUDIT_ROW_LIMIT),
      supabase
        .from("weekly_learning_summaries")
        .select("*")
        .eq("user_id", sessionUser.id)
        .order("created_at", { ascending: false })
        .limit(AUDIT_ROW_LIMIT),
      supabase
        .from("learning_signal_events")
        .select("*")
        .eq("user_id", sessionUser.id)
        .order("created_at", { ascending: false })
        .limit(AUDIT_ROW_LIMIT),
      supabase
        .from("usage_events")
        .select("*")
        .eq("user_id", sessionUser.id)
        .in("event_name", [...AGENDA_USAGE_EVENT_NAMES])
        .order("created_at", { ascending: false })
        .limit(AUDIT_ROW_LIMIT),
      supabase
        .from("action_seeds")
        .select("*")
        .eq("user_id", sessionUser.id)
        .order("created_at", { ascending: false })
        .limit(AUDIT_ROW_LIMIT),
      supabase
        .from("study_profiles")
        .select("*")
        .eq("user_id", sessionUser.id)
        .limit(AUDIT_ROW_LIMIT),
      supabase
        .from("personal_concept_nodes")
        .select("*")
        .eq("user_id", sessionUser.id)
        .order("created_at", { ascending: false })
        .limit(AUDIT_ROW_LIMIT),
    ]);

    const sources = {
      items: rowsFrom(itemsResult),
      notes: rowsFrom(notesResult),
      tags: rowsFrom(tagsResult),
      recurrence: rowsFrom(recurrenceResult),
      reviewQueue: rowsFrom(reviewQueueResult),
      studyLogs: rowsFrom(studyLogsResult),
      weeklySummaries: rowsFrom(weeklySummariesResult),
      learningSignals: rowsFrom(learningSignalsResult),
      agendaUsage: rowsFrom(agendaUsageResult),
      todaySeeds: rowsFrom(todaySeedsResult),
      studyProfiles: rowsFrom(studyProfilesResult),
      conceptNodes: rowsFrom(conceptNodesResult),
    };

    return auditJson({
      ok: true,
      sessionUserId: sessionUser.id,
      sources,
      truncated: {
        items: sources.items.length === AUDIT_ROW_LIMIT,
        notes: sources.notes.length === AUDIT_ROW_LIMIT,
        tags: sources.tags.length === AUDIT_ROW_LIMIT,
        recurrence: sources.recurrence.length === AUDIT_ROW_LIMIT,
        reviewQueue: sources.reviewQueue.length === AUDIT_ROW_LIMIT,
        studyLogs: sources.studyLogs.length === AUDIT_ROW_LIMIT,
        weeklySummaries: sources.weeklySummaries.length === AUDIT_ROW_LIMIT,
        learningSignals: sources.learningSignals.length === AUDIT_ROW_LIMIT,
        agendaUsage: sources.agendaUsage.length === AUDIT_ROW_LIMIT,
        todaySeeds: sources.todaySeeds.length === AUDIT_ROW_LIMIT,
        studyProfiles: sources.studyProfiles.length === AUDIT_ROW_LIMIT,
        conceptNodes: sources.conceptNodes.length === AUDIT_ROW_LIMIT,
      },
    });
  } catch {
    return readFailed();
  }
}
