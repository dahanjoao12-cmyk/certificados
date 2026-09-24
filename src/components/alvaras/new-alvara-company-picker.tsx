"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatDocument } from "@/lib/documents/document";
import { withBasePath } from "@/lib/utils/base-path";
import type { Company } from "@/lib/types/database";

export function NewAlvaraCompanyPicker() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(withBasePath(`/api/search?q=${encodeURIComponent(query)}`));
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={14} /> Novo alvará
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo alvará -- selecione o cliente">
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, CNPJ, CPF ou código..."
              className="w-full rounded-md border-0 bg-slate-100 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200">
            {loading && <p className="px-3 py-2 text-xs text-slate-500">Buscando...</p>}
            {!loading && query.trim().length >= 2 && results.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-500">Nenhum cliente encontrado.</p>
            )}
            {!loading && query.trim().length < 2 && (
              <p className="px-3 py-2 text-xs text-slate-500">Digite ao menos 2 caracteres para buscar.</p>
            )}
            <ul className="divide-y divide-slate-100">
              {results.map((company) => (
                <li key={company.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/clientes/${company.id}/alvaras/novo`)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">{company.corporate_name}</span>
                    <span className="text-xs text-slate-500">
                      Código {company.code} · {formatDocument(company.document)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
}
