"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { DUE_QUICK_FILTER_LABELS, resolveDueQuickFilter, type DueQuickFilter } from "@/lib/certificates/filters";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "EM_DIA", label: "Em dia" },
  { value: "VENCENDO", label: "Vencendo" },
  { value: "VENCE_HOJE", label: "Vence hoje" },
  { value: "VENCIDO", label: "Vencido" },
  { value: "ARQUIVADO", label: "Arquivado" },
];

export function FiltersBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [model, setModel] = useState(searchParams.get("model") ?? "");
  const [municipality, setMunicipality] = useState(searchParams.get("municipality") ?? "");
  const [uf, setUf] = useState(searchParams.get("uf") ?? "");
  const [responsible, setResponsible] = useState(searchParams.get("responsible") ?? "");
  const [due, setDue] = useState("");
  const [dueFrom, setDueFrom] = useState(searchParams.get("dueFrom") ?? "");
  const [dueTo, setDueTo] = useState(searchParams.get("dueTo") ?? "");

  const activeFilterCount = [q, status, type, model, municipality, uf, responsible, dueFrom, dueTo].filter(
    Boolean
  ).length;

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    const set = (key: string, value: string) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };
    set("q", q);
    set("status", status);
    set("type", type);
    set("model", model);
    set("municipality", municipality);
    set("uf", uf);
    set("responsible", responsible);
    set("dueFrom", dueFrom);
    set("dueTo", dueTo);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["q", "status", "type", "model", "municipality", "uf", "responsible", "dueFrom", "dueTo", "archived", "active"]) {
      params.delete(key);
    }
    params.set("page", "1");
    setQ("");
    setStatus("");
    setType("");
    setModel("");
    setMunicipality("");
    setUf("");
    setResponsible("");
    setDue("");
    setDueFrom("");
    setDueTo("");
    router.push(`?${params.toString()}`);
  }

  function handleDueQuickFilter(value: string) {
    setDue(value);
    if (!value || value === "custom") return;
    const { dueFrom: from, dueTo: to } = resolveDueQuickFilter(value as DueQuickFilter);
    setDueFrom(from);
    setDueTo(to);
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700"
      >
        <span className="flex items-center gap-2">
          <Filter size={14} />
          Filtros
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-xs text-white">
              {activeFilterCount}
            </span>
          )}
        </span>
        <span className="text-xs text-slate-400">{open ? "Ocultar" : "Mostrar"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">Empresa, código ou CNPJ/CPF</label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Tipo</label>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Todos</option>
                <option value="e-cnpj">e-CNPJ</option>
                <option value="e-cpf">e-CPF</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Modelo</label>
              <Select value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="">Todos</option>
                <option value="A1">A1</option>
                <option value="A3">A3</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Município</label>
              <Input value={municipality} onChange={(e) => setMunicipality(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">UF</label>
              <Input value={uf} maxLength={2} onChange={(e) => setUf(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Responsável</label>
              <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Vencimento</label>
              <Select value={due} onChange={(e) => handleDueQuickFilter(e.target.value)}>
                <option value="">Qualquer período</option>
                {Object.entries(DUE_QUICK_FILTER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            {due === "custom" && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">De</label>
                  <Input type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Até</label>
                  <Input type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button size="sm" onClick={apply}>
              Aplicar filtros
            </Button>
            <Button size="sm" variant="ghost" onClick={clearAll}>
              <X size={13} /> Limpar filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
