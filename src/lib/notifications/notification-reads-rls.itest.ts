import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { testAdminClient, cleanupTestData, deleteTestUser, TEST_DOCUMENT, testCode } from "@/test/integration/helpers";
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase/env";

/**
 * Regression test for the bug fixed in migration 0008: notification_reads
 * only had select/insert/delete RLS policies. markNotificationRead upserts
 * with onConflict("certificate_id,user_id"), which PostgREST executes as
 * INSERT ... ON CONFLICT DO UPDATE -- the ON CONFLICT branch needs UPDATE
 * privileges. The first upsert for a given (certificate, user) pair is a
 * plain insert and would pass even without the fix; only the SECOND upsert
 * on the same pair exercises the actually-broken path. This must run as a
 * real, RLS-bound user session (not the service-role admin client, which
 * bypasses RLS entirely and would never have caught this).
 */
describe("notification_reads RLS (integration)", () => {
  const testEmail = `integracao-teste-notif-${Date.now()}@example.com`;
  let companyId: string;
  let certificateId: string;
  let userId: string;
  let userClient: SupabaseClient;

  beforeAll(async () => {
    const admin = testAdminClient();

    const { data: company } = await admin
      .from("companies")
      .insert({
        code: testCode("notif-rls"),
        document: TEST_DOCUMENT,
        document_type: "cnpj",
        corporate_name: "Empresa RLS Notificação LTDA",
        active: true,
        origin: "manual",
      })
      .select("id")
      .single();
    companyId = company!.id;

    const inFiveDays = new Date();
    inFiveDays.setDate(inFiveDays.getDate() + 5);
    const { data: certificate } = await admin
      .from("certificates")
      .insert({
        company_id: companyId,
        type: "e-cnpj",
        model: "A1",
        valid_to: inFiveDays.toISOString().slice(0, 10),
        warning_days: 30,
        is_current: false,
        origin: "manual",
      })
      .select("id")
      .single();
    certificateId = certificate!.id;

    // A real (throwaway) logged-in user, obtained non-interactively: follow
    // the same admin-generated link the app's own invite flow produces, and
    // capture the session Supabase's auth server hands back in the redirect
    // Location header's URL fragment (this is exactly what
    // src/app/auth/callback/page.tsx parses from a browser).
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email: testEmail,
      options: { data: { full_name: "Usuário RLS Teste", role: "user" } },
    });
    if (linkError || !linkData.properties?.action_link || !linkData.user) {
      throw new Error(`Falha ao gerar sessão de teste: ${linkError?.message}`);
    }
    userId = linkData.user.id;

    const redirectResponse = await fetch(linkData.properties.action_link, { redirect: "manual" });
    const location = redirectResponse.headers.get("location");
    if (!location) throw new Error("Link de convite não redirecionou com uma sessão.");

    const fragment = new URLSearchParams(new URL(location).hash.slice(1));
    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    if (!accessToken || !refreshToken) throw new Error("Sessão não veio no redirecionamento do convite.");

    userClient = createClient(supabaseUrl(), supabaseAnonKey());
    const { error: sessionError } = await userClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw new Error(`Falha ao aplicar sessão: ${sessionError.message}`);
  });

  afterAll(async () => {
    if (userId) await deleteTestUser(userId);
    await cleanupTestData();
  });

  it("allows the same user to upsert notification_reads for the same certificate twice", async () => {
    const firstUpsert = await userClient
      .from("notification_reads")
      .upsert({ certificate_id: certificateId, user_id: userId }, { onConflict: "certificate_id,user_id" });
    expect(firstUpsert.error).toBeNull();

    // The one that was broken before migration 0008: same (certificate_id,
    // user_id) pair, so PostgREST issues INSERT ... ON CONFLICT DO UPDATE,
    // and the UPDATE branch was rejected with no matching RLS policy.
    const secondUpsert = await userClient
      .from("notification_reads")
      .upsert({ certificate_id: certificateId, user_id: userId }, { onConflict: "certificate_id,user_id" });
    expect(secondUpsert.error).toBeNull();

    const { data: row } = await testAdminClient()
      .from("notification_reads")
      .select("id")
      .eq("certificate_id", certificateId)
      .eq("user_id", userId);
    expect(row).toHaveLength(1); // upsert, not two rows
  });
});
