import { createSupabaseAdminClient } from "@/lib/supabase";

import { getWeakestAxis } from "./daily-mission";
import type { EvaluationRecord } from "./types";

export type EvaluationRepository = {
  save(record: EvaluationRecord): Promise<void>;
};

class SupabaseEvaluationRepository implements EvaluationRepository {
  async save(record: EvaluationRecord): Promise<void> {
    try {
      const client = createSupabaseAdminClient();

      if (!client) {
        return;
      }
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          record.user_id,
        );

      if (!isUuid) {
        return;
      }

      const { data: evaluation } = await client
        .from("evaluations")
        .insert({
          user_id: record.user_id,
          answer: record.answer,
          transcription: record.transcription,
          total_score: record.result.total_score,
          structure_score: record.result.structure_score,
          content_score: record.result.content_score,
          expression_score: record.result.expression_score,
          weaknesses: record.result.weaknesses,
          next_action: record.result.next_action,
        })
        .select("id")
        .single();

      if (!evaluation) {
        return;
      }

      const axis = getWeakestAxis(record.result);

      await client.from("daily_missions").insert({
        user_id: record.user_id,
        evaluation_id: evaluation.id,
        mission_title: `오늘의 집중 축: ${axis.key}`,
        mission_body: axis.mission,
        weakness_tag: record.result.weaknesses[0],
        status: "todo",
      });

      await client.rpc("upsert_analytics_summary", {
        p_user_id: record.user_id,
        p_weaknesses: record.result.weaknesses,
        p_total_score: record.result.total_score,
      });
    } catch {
      return;
    }
  }
}

export const evaluationRepository: EvaluationRepository = new SupabaseEvaluationRepository();
