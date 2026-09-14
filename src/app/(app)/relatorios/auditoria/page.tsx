import { createClient } from "@/lib/supabase/server";
import { loadAuxiliaryReport } from "@/lib/reports/auxiliary";
import { AuxiliaryTable } from "@/components/reports/auxiliary-table";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const supabase = await createClient();
  const report = await loadAuxiliaryReport(supabase, "auditoria");

  return (
    <AuxiliaryTable
      kind="auditoria"
      title="Alterações realizadas por usuários"
      description="Últimas 500 ações registradas no sistema (cadastros, edições, importações, exportações)."
      columns={report.columns}
      rows={report.rows}
      toCells={report.toCells}
    />
  );
}
