import { createClient } from "@/lib/supabase/server";
import { loadAuxiliaryReport } from "@/lib/reports/auxiliary";
import { AuxiliaryTable } from "@/components/reports/auxiliary-table";

export const dynamic = "force-dynamic";

export default async function RenewalsHistoryPage() {
  const supabase = await createClient();
  const report = await loadAuxiliaryReport(supabase, "renovacoes");

  return (
    <AuxiliaryTable
      kind="renovacoes"
      title="Histórico de certificados renovados"
      description="Últimas 500 renovações de certificados registradas."
      columns={report.columns}
      rows={report.rows}
      toCells={report.toCells}
    />
  );
}
