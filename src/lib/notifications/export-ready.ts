import type { SupabaseClient } from "@supabase/supabase-js";
import { createExportReadyNotification } from "./activity";

const BUCKET = "exports";

/**
 * Persists a just-generated export file (the browser already got its own
 * copy synchronously) so it can be downloaded again later, and creates the
 * "Seu download está pronto!" notification pointing at it. Best-effort: a
 * failure here must never fail the export response itself.
 */
export async function notifyExportReady(
  supabase: SupabaseClient,
  params: { userId: string; fileName: string; body: Buffer | string; contentType: string }
): Promise<void> {
  try {
    const path = `${params.userId}/${Date.now()}-${params.fileName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, params.body, {
      contentType: params.contentType,
    });
    if (error) return;

    await createExportReadyNotification(supabase, {
      userId: params.userId,
      fileName: params.fileName,
      storagePath: path,
    });
  } catch {
    // best-effort, see docstring
  }
}
