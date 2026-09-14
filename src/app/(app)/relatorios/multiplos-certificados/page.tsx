import { createClient } from "@/lib/supabase/server";
import { loadAuxiliaryReport } from "@/lib/reports/auxiliary";
import { AuxiliaryTable } from "@/components/reports/auxiliary-table";

export const dynamic = "force-dynamic";

export default async function CompaniesWithMultipleCertificatesPage() {
  const supabase = await createClient();
  const report = await loadAuxiliaryReport(supabase, "multiplos_certificados");

  return (
    <AuxiliaryTable
      kind="multiplos_certificados"
      title="Empresas com mais de um certificado"
      description="Empresas com histórico de mais de um certificado cadastrado."
      columns={report.columns}
      rows={report.rows}
      toCells={report.toCells}
    />
  );
}
