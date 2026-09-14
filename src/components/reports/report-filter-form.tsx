import { Input, Select } from "@/components/ui/input";
import type { ReportBase } from "@/lib/reports/engine";

type SearchParams = Record<string, string | string[] | undefined>;

function get(params: SearchParams, key: string): string {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function ReportFilterForm({ base, searchParams }: { base: ReportBase; searchParams: SearchParams }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-4">
      <input type="hidden" name="base" value={base} />
      {get(searchParams, "cols") && <input type="hidden" name="cols" value={get(searchParams, "cols")} />}

      <div className="min-w-[200px] flex-1">
        <label className="mb-1 block text-xs font-medium text-slate-700">Empresa, código ou CNPJ/CPF</label>
        <Input name="q" defaultValue={get(searchParams, "q")} placeholder="Buscar..." />
      </div>

      {base === "certificates" && (
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-slate-700">Status</label>
          <Select name="status" defaultValue={get(searchParams, "status")}>
            <option value="">Todos</option>
            <option value="EM_DIA">Em dia</option>
            <option value="VENCENDO">Vencendo</option>
            <option value="VENCE_HOJE">Vence hoje</option>
            <option value="VENCIDO">Vencido</option>
            <option value="ARQUIVADO">Arquivado</option>
          </Select>
        </div>
      )}

      {base === "certificates" && (
        <div className="w-32">
          <label className="mb-1 block text-xs font-medium text-slate-700">Modelo</label>
          <Select name="model" defaultValue={get(searchParams, "model")}>
            <option value="">Todos</option>
            <option value="A1">A1</option>
            <option value="A3">A3</option>
          </Select>
        </div>
      )}

      {base === "certificates" && (
        <>
          <div className="w-36">
            <label className="mb-1 block text-xs font-medium text-slate-700">Vencimento de</label>
            <Input type="date" name="dueFrom" defaultValue={get(searchParams, "dueFrom")} />
          </div>
          <div className="w-36">
            <label className="mb-1 block text-xs font-medium text-slate-700">Vencimento até</label>
            <Input type="date" name="dueTo" defaultValue={get(searchParams, "dueTo")} />
          </div>
        </>
      )}

      <div className="w-40">
        <label className="mb-1 block text-xs font-medium text-slate-700">Município</label>
        <Input name={base === "certificates" ? "municipality" : "municipality"} defaultValue={get(searchParams, "municipality")} />
      </div>
      <div className="w-20">
        <label className="mb-1 block text-xs font-medium text-slate-700">UF</label>
        <Input name="uf" maxLength={2} defaultValue={get(searchParams, "uf")} />
      </div>

      <div className="w-32">
        <label className="mb-1 block text-xs font-medium text-slate-700">
          {base === "companies" ? "Situação" : "Empresa ativa"}
        </label>
        <Select name="active" defaultValue={get(searchParams, "active")}>
          <option value="">Todas</option>
          <option value="true">Ativas</option>
          <option value="false">Inativas</option>
        </Select>
      </div>

      {base === "certificates" && (
        <div className="w-32">
          <label className="mb-1 block text-xs font-medium text-slate-700">Arquivado</label>
          <Select name="archived" defaultValue={get(searchParams, "archived")}>
            <option value="">Todos</option>
            <option value="false">Não</option>
            <option value="true">Sim</option>
          </Select>
        </div>
      )}

      <button
        type="submit"
        className="rounded-md bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        Filtrar
      </button>
    </form>
  );
}
