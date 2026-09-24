"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { formatDocument } from "@/lib/documents/document";
import { withBasePath } from "@/lib/utils/base-path";
import type { Company } from "@/lib/types/database";

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar por nome, CNPJ, CPF ou código..."
          className="w-full rounded-md border-0 bg-slate-100 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-w-lg rounded-md border border-slate-200 bg-white shadow-lg">
          {loading && <p className="px-3 py-2 text-xs text-slate-500">Buscando...</p>}
          {!loading && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-500">Nenhuma empresa encontrada.</p>
          )}
          <ul>
            {results.map((company) => (
              <li key={company.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    router.push(`/clientes/${company.id}`);
                  }}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">
                    {company.corporate_name}
                    {company.short_name ? ` · ${company.short_name}` : ""}
                  </span>
                  <span className="text-xs text-slate-500">
                    Código {company.code} · {formatDocument(company.document)}
                    {company.municipality ? ` · ${company.municipality}/${company.uf}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
