import { createClient } from "@/lib/supabase/server";
import { loadAuxiliaryReport } from "@/lib/reports/auxiliary";
import { AuxiliaryTable } from "@/components/reports/auxiliary-table";

export const dynamic = "force-dynamic";

export default async function CompaniesWithoutCertificatePage() {
  const supabase = await createClient();
  const report = await loadAuxiliaryReport(supabase, "sem_certificado");

  return (
    <AuxiliaryTable
      kind="sem_certificado"
      title="Clientes sem certificado cadastrado"
      description="Empresas que ainda não possuem nenhum certificado no sistema."
      columns={report.columns}
      rows={report.rows}
      toCells={report.toCells}
    />
  );
}
