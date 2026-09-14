"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { EXPORTABLE_CERTIFICATE_COLUMNS } from "@/lib/certificates/export-value";

function filtersFromSearchParams(searchParams: URLSearchParams): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const key of [
    "q",
    "status",
    "type",
    "model",
    "municipality",
    "uf",
    "responsible",
    "active",
    "archived",
    "dueFrom",
    "dueTo",
  ]) {
    const value = searchParams.get(key);
    if (value) filters[key] = value;
  }
  return filters;
}

export function ExportDialog({ defaultVisibleColumns }: { defaultVisibleColumns: string[] }) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultVisibleColumns));
  const [fileName, setFileName] = useState("certificados");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleExport() {
    if (selected.size === 0) {
      setError("Selecione ao menos uma coluna.");
      return;
    }
    setExporting(true);
    setError(null);
    try {
      const orderedColumns = EXPORTABLE_CERTIFICATE_COLUMNS.filter((c) => selected.has(c.key)).map((c) => c.key);
      const res = await fetch("/api/export/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          columns: orderedColumns,
          fileName,
          filters: filtersFromSearchParams(searchParams),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Falha ao exportar.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao exportar.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Download size={14} />
        Exportar
      </Button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Exportar certificados</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <p className="mb-3 text-xs text-slate-500">
              Respeita os filtros e a ordenação aplicados na tela atual. Exporta todos os registros filtrados, não
              apenas a página visível.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Formato</Label>
                <Select value={format} onChange={(e) => setFormat(e.target.value as "xlsx" | "csv")}>
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="csv">CSV (.csv)</option>
                </Select>
              </div>
              <div>
                <Label>Nome do arquivo</Label>
                <Input value={fileName} onChange={(e) => setFileName(e.target.value)} />
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between">
                <Label>Campos</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-slate-500 hover:text-slate-900"
                    onClick={() => setSelected(new Set(EXPORTABLE_CERTIFICATE_COLUMNS.map((c) => c.key)))}
                  >
                    Selecionar todos
                  </button>
                  <button
                    type="button"
                    className="text-xs text-slate-500 hover:text-slate-900"
                    onClick={() => setSelected(new Set())}
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto rounded border border-slate-200 p-2">
                {EXPORTABLE_CERTIFICATE_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 py-1 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={selected.has(col.key)}
                      onChange={() => toggle(col.key)}
                      className="h-3.5 w-3.5 rounded border-slate-300"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleExport} disabled={exporting}>
                {exporting ? "Exportando..." : "Exportar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
