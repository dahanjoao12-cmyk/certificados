import { describe, it, expect, afterAll } from "vitest";
import { testAdminClient, cleanupTestData, anyRealProfileId, TEST_DOCUMENT, testCode } from "@/test/integration/helpers";

describe("companies (integration)", () => {
  afterAll(cleanupTestData);

  it("creates a company and enforces the document/code unique constraints", async () => {
    const supabase = testAdminClient();

    const { data: created, error: createError } = await supabase
      .from("companies")
      .insert({
        code: testCode("empresa-1"),
        document: TEST_DOCUMENT,
        document_type: "cnpj",
        corporate_name: "Empresa Teste de Integração LTDA",
        situation: "ativa",
        active: true,
        origin: "manual",
      })
      .select("id, code, document")
      .single();

    expect(createError).toBeNull();
    expect(created?.code).toBe(testCode("empresa-1"));

    // Same document, different code -> companies_document_unique should reject it.
    const { error: dupDocumentError } = await supabase.from("companies").insert({
      code: testCode("empresa-2"),
      document: TEST_DOCUMENT,
      document_type: "cnpj",
      corporate_name: "Outra Razão Social LTDA",
      active: true,
      origin: "manual",
    });
    expect(dupDocumentError?.code).toBe("23505");
    expect(dupDocumentError?.message).toContain("companies_document_unique");

    // Same code, different (but still reserved) document -> companies_code_unique.
    const { error: dupCodeError } = await supabase.from("companies").insert({
      code: testCode("empresa-1"),
      document: "99999900000232", // a second reserved-block CNPJ, distinct from TEST_DOCUMENT
      document_type: "cnpj",
      corporate_name: "Mais Uma Razão Social LTDA",
      active: true,
      origin: "manual",
    });
    expect(dupCodeError?.code).toBe("23505");
    expect(dupCodeError?.message).toContain("companies_code_unique");
  });

  it("cascades delete to certificates and certificate_history", async () => {
    const supabase = testAdminClient();

    const { data: company } = await supabase
      .from("companies")
      .insert({
        code: testCode("cascade"),
        document: "99999900000313",
        document_type: "cnpj",
        corporate_name: "Empresa Cascata LTDA",
        active: true,
        origin: "manual",
      })
      .select("id")
      .single();
    expect(company).not.toBeNull();

    const { data: certificate } = await supabase
      .from("certificates")
      .insert({
        company_id: company!.id,
        type: "e-cnpj",
        model: "A1",
        valid_to: "2030-01-01",
        is_current: true,
        origin: "manual",
      })
      .select("id")
      .single();
    expect(certificate).not.toBeNull();

    await supabase.from("certificate_history").insert({
      certificate_id: certificate!.id,
      company_id: company!.id,
      action: "created",
    });

    const { error: deleteError } = await supabase.from("companies").delete().eq("id", company!.id);
    expect(deleteError).toBeNull();

    const { data: orphanCertificate } = await supabase
      .from("certificates")
      .select("id")
      .eq("id", certificate!.id)
      .maybeSingle();
    expect(orphanCertificate).toBeNull();

    const { data: orphanHistory } = await supabase
      .from("certificate_history")
      .select("id")
      .eq("certificate_id", certificate!.id)
      .maybeSingle();
    expect(orphanHistory).toBeNull();
  });

  it("stores the Fase 1 'cliente' fields (address, inscrições, whatsapp, responsible_user_id) and joins the responsible profile by name", async () => {
    const supabase = testAdminClient();
    const responsibleId = await anyRealProfileId();

    const { data: created, error } = await supabase
      .from("companies")
      .insert({
        code: testCode("cliente-campos"),
        document: "99999900000414",
        document_type: "cnpj",
        corporate_name: "Cliente Campos Novos LTDA",
        active: true,
        origin: "manual",
        state_registration: "123.456.789",
        municipal_tax_registration: "987654",
        whatsapp: "(21) 99999-0000",
        zip_code: "20040-004",
        address_street: "Avenida Rio Branco",
        address_number: "99",
        address_complement: "5º andar",
        neighborhood: "Centro",
        responsible_user_id: responsibleId,
      })
      .select("*, responsible_profile:profiles!companies_responsible_user_id_fkey(full_name)")
      .single();

    expect(error).toBeNull();
    expect(created?.state_registration).toBe("123.456.789");
    expect(created?.municipal_tax_registration).toBe("987654");
    expect(created?.whatsapp).toBe("(21) 99999-0000");
    expect(created?.zip_code).toBe("20040-004");
    expect(created?.neighborhood).toBe("Centro");
    expect(created?.responsible_user_id).toBe(responsibleId);
    expect(created?.responsible_profile?.full_name).toBeTruthy();
  });
});
