import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * These tests run against the real, production Supabase project (there is
 * no separate test project) -- everything they create is scoped under this
 * reserved, checksum-valid-but-obviously-fake CNPJ and a "TESTE-" company
 * code prefix that real imports/forms would never produce, and every test
 * cleans up in `afterEach`/`afterAll`. Never reuse this document for
 * anything real.
 */
export const TEST_DOCUMENT = "99999900000151";
/** A second reserved, checksum-valid document -- for tests needing two distinct companies (e.g. the importer, which validates the CNPJ checksum before touching the DB). */
export const TEST_DOCUMENT_2 = "88888800000131";
export const TEST_CODE_PREFIX = "TESTE-";

let client: SupabaseClient | null = null;

/** Service-role client so setup/teardown never depends on RLS. */
export function testAdminClient(): SupabaseClient {
  if (!client) client = createAdminClient();
  return client;
}

export function testCode(suffix: string): string {
  return `${TEST_CODE_PREFIX}${suffix}`;
}

/**
 * Deletes everything the reserved test document/code touched, in FK-safe
 * order: imports (cascades import_rows) before companies (cascades
 * certificates -> certificate_history/notification_reads), then any
 * leftover audit_logs pointing at deleted rows. Safe to call even if a test
 * failed partway through and created only some of this.
 */
export async function cleanupTestData(): Promise<void> {
  const supabase = testAdminClient();

  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .or(`document.eq.${TEST_DOCUMENT},code.like.${TEST_CODE_PREFIX}%`);
  const companyIds = (companies ?? []).map((c) => c.id as string);

  if (companyIds.length > 0) {
    const importIds = await importIdsForCompanies(supabase, companyIds);
    if (importIds.length > 0) {
      await supabase.from("imports").delete().in("id", importIds);
    }
    await supabase.from("audit_logs").delete().in("entity_id", companyIds);
    await supabase.from("companies").delete().in("id", companyIds);
  }
}

async function importIdsForCompanies(supabase: SupabaseClient, companyIds: string[]): Promise<string[]> {
  const { data } = await supabase.from("import_rows").select("import_id").in("company_id", companyIds);
  return [...new Set((data ?? []).map((r) => r.import_id as string))];
}

/**
 * created_by/changed_by/imported_by columns have a real FK to profiles(id)
 * -- a made-up UUID would fail that constraint, so tests that need "some
 * user did this" borrow whichever real profile happens to exist (there is
 * no test project, so there is no throwaway user to create one for
 * instead). Never written to, only read.
 */
export async function anyRealProfileId(): Promise<string> {
  const { data, error } = await testAdminClient().from("profiles").select("id").limit(1).single();
  if (error || !data) {
    throw new Error("No profile found -- integration tests need at least one existing user in this Supabase project.");
  }
  return data.id as string;
}

/** Deletes a test auth user created via generateLink -- cascades to profiles. */
export async function deleteTestUser(userId: string): Promise<void> {
  await testAdminClient().auth.admin.deleteUser(userId);
}
