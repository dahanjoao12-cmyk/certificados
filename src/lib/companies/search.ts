import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDocument } from "@/lib/documents/document";
import type { Company } from "@/lib/types/database";

/**
 * Global search used by the top bar and by "buscar por nome, CNPJ, CPF ou
 * código". Tolerates a formatted or unformatted document (68.702.974/0001-50
 * and 68702974000150 both match), and does a partial match on code/name.
 */
export async function searchCompanies(
  supabase: SupabaseClient,
  query: string,
  limit = 8
): Promise<Company[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const normalizedDoc = normalizeDocument(trimmed);
  const escaped = trimmed.replace(/[%_]/g, (m) => `\\${m}`);

  const orConditions = [
    `code.ilike.%${escaped}%`,
    `corporate_name.ilike.%${escaped}%`,
    `trade_name.ilike.%${escaped}%`,
    `short_name.ilike.%${escaped}%`,
  ];

  // Only add a document condition when the query has digits, otherwise a
  // plain-text search would be forced to match an (empty) normalized string.
  if (normalizedDoc.length > 0) {
    orConditions.push(`document.ilike.%${normalizedDoc}%`);
  }

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .or(orConditions.join(","))
    .order("corporate_name", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data as Company[];
}
