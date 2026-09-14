import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Writes one row to audit_logs. Best-effort: a logging failure must never
 * block the actual business operation, so callers should not await this
 * inside a transaction-critical path without a try/catch of their own.
 *
 * Per section 49/69: never pass certificate passwords or other secrets in
 * `metadata` -- this is a plain activity log, not a place for credentials.
 */
export async function logAudit(
  supabase: SupabaseClient,
  params: {
    userId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    description: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await supabase.from("audit_logs").insert({
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    description: params.description,
    metadata: params.metadata ?? {},
  });
}
