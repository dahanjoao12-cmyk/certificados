import { createClient } from "@/lib/supabase/server";
import { listAlvaraTypes } from "@/lib/alvaras/queries";
import { AlvaraTypesManager } from "@/components/alvaras/types-manager";

export const dynamic = "force-dynamic";

export default async function AlvaraTypesPage() {
  const supabase = await createClient();
  const types = await listAlvaraTypes(supabase);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Tipos de Alvará</h1>
        <p className="text-sm text-slate-500">
          Nome e cor de cada tipo (ex. Sanitário, Localização e Funcionamento) -- usados na tabela e no calendário do
          Dashboard.
        </p>
      </div>
      <AlvaraTypesManager types={types} />
    </div>
  );
}
