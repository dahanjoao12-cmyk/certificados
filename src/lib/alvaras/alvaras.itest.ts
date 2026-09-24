import { describe, it, expect, afterAll } from "vitest";
import { testAdminClient, cleanupTestData, testCode, TEST_DOCUMENT_2 } from "@/test/integration/helpers";

describe("alvaras (integration)", () => {
  let typeId: string | undefined;
  let companyId: string | undefined;

  afterAll(async () => {
    await cleanupTestData(); // deletes the test company, cascading to its alvaras/alvara_history
    if (typeId) {
      const supabase = testAdminClient();
      await supabase.from("alvara_types").delete().eq("id", typeId);
    }
  });

  it("enforces the tri-state check constraint at the DB level", async () => {
    const supabase = testAdminClient();

    const { data: company } = await supabase
      .from("companies")
      .insert({
        code: testCode("alvara-empresa"),
        document: TEST_DOCUMENT_2,
        document_type: "cnpj",
        corporate_name: "Empresa Alvará Teste LTDA",
        active: true,
        origin: "manual",
      })
      .select("id")
      .single();
    companyId = company!.id;

    const { data: type } = await supabase
      .from("alvara_types")
      .insert({ name: `Tipo de Teste ${Date.now()}`, color: "#2563eb" })
      .select("id")
      .single();
    typeId = type!.id;

    // Válido: pendente, sem data.
    const { error: pendingError } = await supabase.from("alvaras").insert({
      company_id: companyId,
      type_id: typeId,
      manual_status: "AGUARDANDO",
      issued: false,
      is_permanent: false,
      valid_to: null,
      origin: "manual",
    });
    expect(pendingError).toBeNull();

    // Inválido: emitido sem ser permanente, mas sem data.
    const { error: inconsistentError } = await supabase.from("alvaras").insert({
      company_id: companyId,
      type_id: typeId,
      manual_status: "AGUARDANDO",
      issued: true,
      is_permanent: false,
      valid_to: null,
      origin: "manual",
    });
    expect(inconsistentError).not.toBeNull();
    expect(inconsistentError?.message).toContain("alvaras_status_consistency");
  });

  it("computes status live via alvaras_view for each branch of the tri-state", async () => {
    const supabase = testAdminClient();

    const { data: pending } = await supabase
      .from("alvaras")
      .insert({
        company_id: companyId,
        type_id: typeId,
        manual_status: "CGSIM",
        issued: false,
        is_permanent: false,
        valid_to: null,
        origin: "manual",
      })
      .select("id")
      .single();

    const { data: permanent } = await supabase
      .from("alvaras")
      .insert({
        company_id: companyId,
        type_id: typeId,
        manual_status: "AGUARDANDO",
        issued: true,
        is_permanent: true,
        valid_to: null,
        origin: "manual",
      })
      .select("id")
      .single();

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    const { data: overdue } = await supabase
      .from("alvaras")
      .insert({
        company_id: companyId,
        type_id: typeId,
        manual_status: "AGUARDANDO",
        issued: true,
        is_permanent: false,
        valid_to: pastDate.toISOString().slice(0, 10),
        origin: "manual",
      })
      .select("id")
      .single();

    const { data: rows } = await supabase
      .from("alvaras_view")
      .select("id, status, days_remaining, type_name")
      .in("id", [pending!.id, permanent!.id, overdue!.id]);

    const byId = new Map((rows ?? []).map((r) => [r.id as string, r]));
    expect(byId.get(pending!.id)?.status).toBe("CGSIM");
    expect(byId.get(permanent!.id)?.status).toBe("DEFINITIVO");
    expect(byId.get(permanent!.id)?.days_remaining).toBeNull();
    expect(byId.get(overdue!.id)?.status).toBe("VENCIDO");
    expect(byId.get(overdue!.id)?.type_name).toBeTruthy();
  });
});
