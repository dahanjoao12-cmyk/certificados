import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { insertCertificateForCompany } from "@/lib/certificates/create";
import { testAdminClient, cleanupTestData, testCode } from "@/test/integration/helpers";

describe("insertCertificateForCompany + certificate_status (integration)", () => {
  let companyId: string;

  beforeAll(async () => {
    const supabase = testAdminClient();
    const { data: company } = await supabase
      .from("companies")
      .insert({
        code: testCode("certs"),
        document: "99999900000488",
        document_type: "cnpj",
        corporate_name: "Empresa Certificados LTDA",
        active: true,
        origin: "manual",
      })
      .select("id")
      .single();
    companyId = company!.id;
  });

  afterAll(cleanupTestData);

  it("creates the first certificate as current, then demotes it on renewal", async () => {
    const supabase = testAdminClient();

    const first = await insertCertificateForCompany(supabase, {
      companyId,
      userId: null as unknown as string, // created_by/changed_by are nullable; no real user needed for this check
      fields: { type: "e-cnpj", model: "A1", valid_to: "2026-06-01" },
      origin: "manual",
    });
    expect(first.isRenewal).toBe(false);

    const second = await insertCertificateForCompany(supabase, {
      companyId,
      userId: null as unknown as string,
      fields: { type: "e-cnpj", model: "A1", valid_to: "2027-06-01" },
      origin: "manual",
    });
    expect(second.isRenewal).toBe(true);

    const { data: firstRow } = await supabase
      .from("certificates")
      .select("is_current")
      .eq("id", first.certificateId)
      .single();
    expect(firstRow?.is_current).toBe(false);

    const { data: secondRow } = await supabase
      .from("certificates")
      .select("is_current")
      .eq("id", second.certificateId)
      .single();
    expect(secondRow?.is_current).toBe(true);

    const { data: history } = await supabase
      .from("certificate_history")
      .select("action, old_value, new_value")
      .eq("certificate_id", second.certificateId)
      .single();
    expect(history?.action).toBe("renewed");
    expect(history?.old_value).toBe("2026-06-01");
    expect(history?.new_value).toBe("2027-06-01");
  });

  it("computes status via certificates_view using the SQL function, honoring per-certificate warning_days", async () => {
    const supabase = testAdminClient();
    const today = new Date();
    const inDays = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };

    const cases: { valid_to: string; warning_days: number | null; archived: boolean; expected: string }[] = [
      { valid_to: inDays(400), warning_days: null, archived: false, expected: "EM_DIA" },
      { valid_to: inDays(10), warning_days: null, archived: false, expected: "VENCENDO" }, // within global default (30)
      { valid_to: inDays(10), warning_days: 5, archived: false, expected: "EM_DIA" }, // tighter per-cert window excludes it
      { valid_to: inDays(0), warning_days: null, archived: false, expected: "VENCE_HOJE" },
      { valid_to: inDays(-5), warning_days: null, archived: false, expected: "VENCIDO" },
      { valid_to: inDays(-5), warning_days: null, archived: true, expected: "ARQUIVADO" },
    ];

    for (const testCase of cases) {
      const { data: certificate, error } = await supabase
        .from("certificates")
        .insert({
          company_id: companyId,
          type: "e-cnpj",
          model: "A1",
          valid_to: testCase.valid_to,
          warning_days: testCase.warning_days,
          archived: testCase.archived,
          is_current: false, // avoid tripping the single-current trigger against the earlier test's row
          origin: "manual",
        })
        .select("id")
        .single();
      expect(error).toBeNull();

      const { data: viewRow } = await supabase
        .from("certificates_view")
        .select("status")
        .eq("id", certificate!.id)
        .single();

      expect(viewRow?.status, `valid_to=${testCase.valid_to} warning_days=${testCase.warning_days} archived=${testCase.archived}`).toBe(
        testCase.expected
      );
    }
  });
});
