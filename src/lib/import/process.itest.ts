import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { processImportRows } from "@/lib/import/process";
import {
  testAdminClient,
  cleanupTestData,
  anyRealProfileId,
  TEST_DOCUMENT,
  TEST_DOCUMENT_2,
  testCode,
} from "@/test/integration/helpers";
import { formatDocument } from "@/lib/documents/document";

const MAPPING = {
  CNPJ: "document",
  Codigo: "code",
  Razao: "corporate_name",
  Vencimento: "valid_to",
};

describe("processImportRows (integration)", () => {
  let userId: string;

  beforeAll(async () => {
    userId = await anyRealProfileId();
  });

  afterAll(cleanupTestData);

  it("creates a new company AND its certificate, counting both (regression for the undercount bug)", async () => {
    const supabase = testAdminClient();

    const summary = await processImportRows(
      supabase,
      [
        {
          CNPJ: formatDocument(TEST_DOCUMENT),
          Codigo: testCode("import-novo"),
          Razao: "Empresa Import Nova LTDA",
          Vencimento: "2028-01-01",
        },
      ],
      MAPPING,
      userId,
      false
    );

    expect(summary.companiesCreated).toBe(1);
    expect(summary.certificatesCreated).toBe(1);
    expect(summary.errors).toBe(0);
    expect(summary.conflicts).toBe(0);

    const { data: company } = await supabase
      .from("companies")
      .select("id, code")
      .eq("document", TEST_DOCUMENT)
      .single();
    expect(company?.code).toBe(testCode("import-novo"));

    const { data: certificate } = await supabase
      .from("certificates")
      .select("valid_to, is_current")
      .eq("company_id", company!.id)
      .single();
    expect(certificate?.valid_to).toBe("2028-01-01");
    expect(certificate?.is_current).toBe(true);
  });

  it("flags a company-code conflict by default, and applies it when resolved as use_imported", async () => {
    const supabase = testAdminClient();

    // First pass: no resolutions, mirrors the preview (dry-run) step -- the
    // second row's different code is reported as a conflict, not applied.
    const preview = await processImportRows(
      supabase,
      [
        { CNPJ: formatDocument(TEST_DOCUMENT_2), Codigo: testCode("res-a"), Razao: "Empresa Resolução LTDA" },
        { CNPJ: formatDocument(TEST_DOCUMENT_2), Codigo: testCode("res-b"), Razao: "Empresa Resolução LTDA" },
      ],
      MAPPING,
      userId,
      true // dryRun
    );
    expect(preview.rows[1].result).toBe("conflict");
    expect(preview.rows[1].conflict).toEqual({
      field: "code",
      existingValue: testCode("res-a"),
      importedValue: testCode("res-b"),
    });

    // Commit for real, without a resolution: row 2 (rowNumber 2) creates the
    // company; row 3 (rowNumber 3) should still just conflict, keeping "res-a".
    await processImportRows(
      supabase,
      [
        { CNPJ: formatDocument(TEST_DOCUMENT_2), Codigo: testCode("res-a"), Razao: "Empresa Resolução LTDA" },
        { CNPJ: formatDocument(TEST_DOCUMENT_2), Codigo: testCode("res-b"), Razao: "Empresa Resolução LTDA" },
      ],
      MAPPING,
      userId,
      false
    );

    const { data: afterConflict } = await supabase
      .from("companies")
      .select("code")
      .eq("document", TEST_DOCUMENT_2)
      .single();
    expect(afterConflict?.code).toBe(testCode("res-a"));

    // Re-run the same commit, this time resolving row 3's conflict as "use
    // the imported value" -- the company's code should update to "res-b".
    const resolved = await processImportRows(
      supabase,
      [
        { CNPJ: formatDocument(TEST_DOCUMENT_2), Codigo: testCode("res-a"), Razao: "Empresa Resolução LTDA" },
        { CNPJ: formatDocument(TEST_DOCUMENT_2), Codigo: testCode("res-b"), Razao: "Empresa Resolução LTDA" },
      ],
      MAPPING,
      userId,
      false,
      { "3": "use_imported" }
    );
    expect(resolved.rows[1].result).toBe("company_updated");
    expect(resolved.conflicts).toBe(0);

    const { data: afterResolved } = await supabase
      .from("companies")
      .select("code")
      .eq("document", TEST_DOCUMENT_2)
      .single();
    expect(afterResolved?.code).toBe(testCode("res-b"));
  });
});
