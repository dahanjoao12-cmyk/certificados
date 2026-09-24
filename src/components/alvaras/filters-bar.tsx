"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ALVARA_STATUS_LABELS } from "@/lib/alvaras/status";
import type { AlvaraType } from "@/lib/types/database";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos os status" },
  ...Object.entries(ALVARA_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

export function AlvarasFiltersBar({ types }: { types: AlvaraType[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [typeId, setTypeId] = useState(searchParams.get("typeId") ?? "");
  const [prioritario, setPrioritario] = useState(searchParams.get("prioritario") ?? "");
  const [uf, setUf] = useState(searchParams.get("uf") ?? "");
  const [municipality, setMunicipality] = useState(searchParams.get("municipality") ?? "");
  const [dueFrom, setDueFrom] = useState(searchParams.get("dueFrom") ?? "");
  const [dueTo, setDueTo] = useState(searchParams.get("dueTo") ?? "");

  const activeFilterCount = [q, status, typeId, prioritario, uf, municipality, dueFrom, dueTo].filter(Boolean).length;

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    const set = (key: string, value: string) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };
    set("q", q);
    set("status", status);
    set("typeId", typeId);
    set("prioritario", prioritario);
    set("uf", uf);
    set("municipality", municipality);
    set("dueFrom", dueFrom);
    set("dueTo", dueTo);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["q", "status", "typeId", "prioritario", "uf", "municipality", "dueFrom", "dueTo", "archived"]) {
      params.delete(key);
    }
    params.set("page", "1");
    setQ("");
    setStatus("");
    setTypeId("");
    setPrioritario("");
    setUf("");
    setMunicipality("");
    setDueFrom("");
    setDueTo("");
    router.push(`?${params.toString()}`);
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
            <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-xs text-white">{activeFilterCount}</span>
          )}
        </span>
        <span className="text-xs text-slate-400">{open ? "Ocultar" : "Mostrar"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">Empresa, código ou tipo</label>
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
              <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                <option value="">Todos</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Prioritário</label>
              <Select value={prioritario} onChange={(e) => setPrioritario(e.target.value)}>
                <option value="">Todos</option>
                <option value="true">Só prioritários</option>
                <option value="false">Não prioritários</option>
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
              <label className="mb-1 block text-xs font-medium text-slate-700">Vencimento de</label>
              <Input type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Vencimento até</label>
              <Input type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} />
            </div>
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
