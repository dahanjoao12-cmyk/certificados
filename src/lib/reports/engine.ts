import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COMPANY_COLUMNS,
  DEFAULT_VISIBLE_COMPANY_COLUMNS,
  getCompanyExportValue,
} from "@/lib/companies/columns";
import { parseCompanyFilters, listCompanies, type CompanyFilters } from "@/lib/companies/queries";
import {
  EXPORTABLE_CERTIFICATE_COLUMNS,
  getCertificateExportValue,
} from "@/lib/certificates/export-value";
import { DEFAULT_VISIBLE_CERTIFICATE_COLUMNS } from "@/lib/certificates/columns";
import { parseCertificateFilters, type CertificateFilters } from "@/lib/certificates/filters";
import { listCertificates, listAllCertificates } from "@/lib/certificates/queries";
import type { ExportCell } from "@/lib/certificates/export-value";

export type ReportBase = "companies" | "certificates";

export const REPORT_BASE_LABELS: Record<ReportBase, string> = {
  companies: "Empresas",
  certificates: "Certificados (inclui dados da empresa)",
};

type SearchParams = Record<string, string | string[] | undefined>;

export function getReportColumns(base: ReportBase) {
  return base === "companies" ? COMPANY_COLUMNS : EXPORTABLE_CERTIFICATE_COLUMNS;
}

export function getDefaultReportColumns(base: ReportBase): string[] {
  return base === "companies" ? DEFAULT_VISIBLE_COMPANY_COLUMNS : DEFAULT_VISIBLE_CERTIFICATE_COLUMNS;
}

export function getExportValue(base: ReportBase, row: Record<string, unknown>, key: string): ExportCell {
  return base === "companies"
    ? getCompanyExportValue(row as never, key)
    : getCertificateExportValue(row as never, key);
}

export async function runReport(
  supabase: SupabaseClient,
  base: ReportBase,
  searchParams: SearchParams
): Promise<{ rows: Record<string, unknown>[]; total: number; filters: CompanyFilters | CertificateFilters }> {
  if (base === "companies") {
    const filters = parseCompanyFilters(searchParams);
    const { rows, total } = await listCompanies(supabase, filters);
    return { rows: rows as unknown as Record<string, unknown>[], total, filters };
  }
  const filters = parseCertificateFilters(searchParams);
  const { rows, total } = await listCertificates(supabase, filters);
  return { rows: rows as unknown as Record<string, unknown>[], total, filters };
}

export async function runReportAll(
  supabase: SupabaseClient,
  base: ReportBase,
  searchParams: SearchParams
): Promise<Record<string, unknown>[]> {
  if (base === "companies") {
    const filters = { ...parseCompanyFilters(searchParams), page: 1, pageSize: 1000 };
    const rows: Record<string, unknown>[] = [];
    let page = 1;
    // Companies has no "all" helper; page through with the max page size.
    for (;;) {
      const { rows: pageRows, total } = await listCompanies(supabase, { ...filters, page });
      rows.push(...(pageRows as unknown as Record<string, unknown>[]));
      if (rows.length >= total || pageRows.length === 0) break;
      page += 1;
      if (page > 50) break; // hard safety cap
    }
    return rows;
  }
  const filters = parseCertificateFilters(searchParams);
  const rows = await listAllCertificates(supabase, filters);
  return rows as unknown as Record<string, unknown>[];
}
