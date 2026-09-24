import { describe, it, expect, afterAll } from "vitest";
import { testAdminClient, cleanupTestData, testCode, anyRealProfileId, TEST_DOCUMENT } from "@/test/integration/helpers";
import { processAlvaraImportRows } from "./import";

// A checksum-valid CNPJ from the same reserved block as TEST_DOCUMENT, but
// deliberately never inserted as a company -- exercises the "not found" path.
const UNMATCHED_DOCUMENT = "99.999.900/0005-85";

describe("processAlvaraImportRows (integration)", () => {
  const typeNamePendente = `Tipo Import Teste Pendente ${Date.now()}`;
  const typeNameComData = `Tipo Import Teste Com Data ${Date.now()}`;

  afterAll(async () => {
    await cleanupTestData(); // deletes the test company, cascading to its alvaras
    const supabase = testAdminClient();
    await supabase.from("alvara_types").delete().in("name", [typeNamePendente, typeNameComData]);
  });

  it("matches by document, auto-creates missing types, and maps status text into the tri-state", async () => {
    const supabase = testAdminClient();

    const { data: company } = await supabase
      .from("companies")
      .insert({
        code: testCode("import-alvara"),
        document: TEST_DOCUMENT,
        document_type: "cnpj",
        corporate_name: "Empresa Import Alvará Teste LTDA",
        active: true,
        origin: "manual",
      })
      .select("id")
      .single();

    const mapping = {
      "CNPJ/CPF": "document",
      Tipo: "tipo",
      Status: "status",
      Vencimento: "vencimento",
      Prioritario: "prioritario",
      Arquivado: "arquivado",
      "Condicionantes Total": "condicionantes_total",
      "Condicionantes Atendidas": "condicionantes_atendidas",
      Municipio: "municipio",
      UF: "uf",
      Lembretes: "lembretes",
      "Criado Em": "criado_em",
    };

    const rawRows = [
      {
        "CNPJ/CPF": TEST_DOCUMENT,
        Tipo: typeNamePendente,
        Status: "AGUARDANDO",
        Vencimento: "",
        Prioritario: "Não",
        Arquivado: "Não",
        "Condicionantes Total": "0",
        "Condicionantes Atendidas": "0",
        Municipio: "Rio de Janeiro",
        UF: "RJ",
        Lembretes: "",
        "Criado Em": "18/06/2026 14:31",
      },
      {
        "CNPJ/CPF": TEST_DOCUMENT,
        Tipo: typeNameComData,
        Status: "VENCIDO",
        Vencimento: "30/04/2026",
        Prioritario: "Sim",
        Arquivado: "Não",
        "Condicionantes Total": "3",
        "Condicionantes Atendidas": "5",
        Municipio: "Niterói",
        UF: "RJ",
        Lembretes: "",
        "Criado Em": "16/10/2025 11:45",
      },
      {
        "CNPJ/CPF": UNMATCHED_DOCUMENT,
        Tipo: typeNamePendente,
        Status: "AGUARDANDO",
        Vencimento: "",
        Prioritario: "",
        Arquivado: "",
        "Condicionantes Total": "",
        "Condicionantes Atendidas": "",
        Municipio: "",
        UF: "",
        Lembretes: "",
        "Criado Em": "",
      },
    ];

    // Dry run: no writes, but the outcome shape must already be correct.
    const dryRun = await processAlvaraImportRows(supabase, rawRows, mapping, "00000000-0000-0000-0000-000000000000", true);
    expect(dryRun.alvarasCreated).toBe(2);
    expect(dryRun.typesCreated).toBe(2);
    expect(dryRun.errors).toBe(1);
    expect(dryRun.rows[2].result).toBe("error");
    expect(dryRun.rows[2].message).toContain("não encontrado em Clientes");

    const userId = await anyRealProfileId();

    const commit = await processAlvaraImportRows(supabase, rawRows, mapping, userId, false);
    expect(commit.alvarasCreated).toBe(2);
    expect(commit.typesCreated).toBe(2);
    expect(commit.errors).toBe(1);

    const { data: alvaras } = await supabase
      .from("alvaras_view")
      .select("*")
      .eq("company_id", company!.id)
      .order("type_name");

    expect(alvaras).toHaveLength(2);
    const pendente = alvaras!.find((a) => a.type_name === typeNamePendente)!;
    const comData = alvaras!.find((a) => a.type_name === typeNameComData)!;

    expect(pendente.status).toBe("AGUARDANDO");
    expect(pendente.issued).toBe(false);
    expect(pendente.valid_to).toBeNull();

    // The imported "VENCIDO" label is ignored -- the date wins, and status
    // is recomputed live (a date this far away is not actually overdue).
    expect(comData.issued).toBe(true);
    expect(comData.is_permanent).toBe(false);
    expect(comData.valid_to).toBe("2026-04-30");
    expect(comData.prioritario).toBe(true);
    expect(comData.condicionantes_atendidas).toBeLessThanOrEqual(comData.condicionantes_total);
  });
});
