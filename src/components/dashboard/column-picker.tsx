"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Columns3, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ColumnDef } from "@/lib/certificates/columns";
import { saveTablePreference } from "@/lib/table-preferences/actions";

export function ColumnPicker({
  allColumns,
  visibleKeys,
  tableKey,
}: {
  allColumns: ColumnDef[];
  visibleKeys: string[];
  tableKey: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<string[]>(visibleKeys);
  const [checked, setChecked] = useState<Set<string>>(new Set(visibleKeys));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function orderedList(): string[] {
    // Keep checked columns in `order`, appended with any newly-checked ones.
    const known = new Set(order);
    const extra = allColumns.map((c) => c.key).filter((k) => !known.has(k));
    return [...order, ...extra].filter((k) => checked.has(k));
  }

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function move(key: string, direction: -1 | 1) {
    setOrder((prev) => {
      const list = prev.includes(key) ? [...prev] : [...prev, key];
      const idx = list.indexOf(key);
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= list.length) return prev;
      [list[idx], list[newIdx]] = [list[newIdx], list[idx]];
      return list;
    });
  }

  function applyToUrl(cols: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cols", cols.join(","));
    router.push(`?${params.toString()}`);
  }

  function handleApply() {
    applyToUrl(orderedList());
    setOpen(false);
  }

  async function handleSaveDefault() {
    const cols = orderedList();
    await saveTablePreference(tableKey, cols);
    applyToUrl(cols);
    setOpen(false);
  }

  const displayOrder = [...new Set([...order, ...allColumns.map((c) => c.key)])];

  return (
    <div ref={containerRef} className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
        <Columns3 size={14} />
        Colunas
      </Button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-700">Selecione os campos</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-900"
                onClick={() => setChecked(new Set(allColumns.map((c) => c.key)))}
              >
                Selecionar todos
              </button>
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-900"
                onClick={() => setChecked(new Set())}
              >
                Limpar
              </button>
            </div>
          </div>

          <ul className="max-h-72 space-y-0.5 overflow-y-auto">
            {displayOrder.map((key) => {
              const col = allColumns.find((c) => c.key === key);
              if (!col) return null;
              return (
                <li key={key} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={checked.has(key)}
                    onChange={() => toggle(key)}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  <span className="flex-1 text-xs text-slate-700">{col.label}</span>
                  <button type="button" onClick={() => move(key, -1)} className="text-slate-400 hover:text-slate-700">
                    <ChevronUp size={13} />
                  </button>
                  <button type="button" onClick={() => move(key, 1)} className="text-slate-400 hover:text-slate-700">
                    <ChevronDown size={13} />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-2">
            <Button variant="ghost" size="sm" onClick={handleApply}>
              Aplicar
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSaveDefault}>
              Salvar como padrão
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
