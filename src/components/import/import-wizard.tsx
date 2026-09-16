"use client";

import { useState } from "react";
import Link from "next/link";
import { UploadCloud, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { IMPORT_TARGET_FIELDS } from "@/lib/import/fields";
import { withBasePath } from "@/lib/utils/base-path";
import type { ImportRowOutcome, RowResolution } from "@/lib/import/process";

type Step = "upload" | "mapping" | "preview" | "done";

interface AnalyzeResponse {
  headers: string[];
  suggestions: Record<string, string | null>;
  rowCount: number;
  sampleRows: Record<string, string>[];
}

interface SummaryResponse {
  totalRows: number;
  companiesCreated: number;
  companiesUpdated: number;
  certificatesCreated: number;
  duplicates: number;
  conflicts: number;
  errors: number;
  rows: ImportRowOutcome[];
  importId?: string;
}

const RESULT_LABELS: Record<string, string> = {
  company_created: "Empresa criada",
  company_updated: "Empresa atualizada",
  certificate_created: "Certificado criado",
  duplicate: "Duplicidade ignorada",
  conflict: "Conflito",
  error: "Erro",
  skipped: "Sem alteração",
};

const RESULT_COLORS: Record<string, string> = {
  company_created: "text-emerald-700",
  company_updated: "text-sky-700",
  certificate_created: "text-emerald-700",
  duplicate: "text-slate-500",
  conflict: "text-amber-700",
  error: "text-red-700",
  skipped: "text-slate-400",
};

export function ImportWizard() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<SummaryResponse | null>(null);
  const [result, setResult] = useState<SummaryResponse | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, RowResolution>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(selected: File) {
    setFile(selected);
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selected);
      const res = await fetch(withBasePath("/api/import/analyze"), { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao ler o arquivo.");
      setAnalysis(data);
      setMapping(
        Object.fromEntries(
          data.headers.map((h: string) => [h, data.suggestions[h] ?? ""])
        )
      );
      setStep("mapping");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler o arquivo.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapping", JSON.stringify(mapping));
      const res = await fetch(withBasePath("/api/import/preview"), { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao gerar prévia.");
      setPreview(data);
      setResolutions({});
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar prévia.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapping", JSON.stringify(mapping));
      formData.append("fileName", file.name);
      formData.append("resolutions", JSON.stringify(resolutions));
      const res = await fetch(withBasePath("/api/import/commit"), { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao importar.");
      setResult(data);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao importar.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("upload");
    setFile(null);
    setAnalysis(null);
    setMapping({});
    setPreview(null);
    setResult(null);
    setResolutions({});
    setError(null);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      {step === "upload" && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center hover:border-slate-400">
          <UploadCloud size={28} className="text-slate-400" />
          <p className="text-sm font-medium text-slate-700">
            {loading ? "Lendo arquivo..." : "Clique para selecionar uma planilha"}
          </p>
          <p className="text-xs text-slate-500">.xlsx, .xls ou .csv</p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) handleFileSelected(selected);
            }}
          />
        </label>
      )}

      {step === "mapping" && analysis && (
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-700">
              <strong>{file?.name}</strong> · {analysis.rowCount} linha(s) encontrada(s)
            </p>
          </div>

          <div className="rounded-md border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2">Coluna do arquivo</th>
                  <th className="px-4 py-2">Exemplo</th>
                  <th className="px-4 py-2">Campo do sistema</th>
                </tr>
              </thead>
              <tbody>
                {analysis.headers.map((header) => (
                  <tr key={header} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2 font-medium text-slate-800">{header}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {analysis.sampleRows[0]?.[header] ?? "-"}
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        value={mapping[header] ?? ""}
                        onChange={(e) => setMapping((prev) => ({ ...prev, [header]: e.target.value }))}
                      >
                        <option value="">Ignorar coluna</option>
                        {IMPORT_TARGET_FIELDS.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePreview} disabled={loading}>
              {loading ? "Analisando..." : "Analisar"} <ArrowRight size={14} />
            </Button>
            <Button variant="ghost" onClick={reset}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Linhas" value={preview.totalRows} />
            <SummaryCard label="Empresas novas" value={preview.companiesCreated} />
            <SummaryCard label="Empresas atualizadas" value={preview.companiesUpdated} />
            <SummaryCard label="Certificados novos" value={preview.certificatesCreated} />
            <SummaryCard label="Duplicidades" value={preview.duplicates} />
            <SummaryCard label="Conflitos" value={preview.conflicts} warn={preview.conflicts > 0} />
            <SummaryCard label="Erros" value={preview.errors} warn={preview.errors > 0} />
          </div>

          <RowsTable rows={preview.rows} resolutions={resolutions} onResolutionChange={setResolutions} />

          <div className="flex gap-2">
            <Button onClick={handleCommit} disabled={loading}>
              {loading ? "Importando..." : "Confirmar importação"}
            </Button>
            <Button variant="secondary" onClick={() => setStep("mapping")}>
              Revisar mapeamento
            </Button>
            <Button variant="ghost" onClick={reset}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-3 text-emerald-800 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 size={18} />
            <p className="text-sm font-medium">Importação concluída.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Empresas criadas" value={result.companiesCreated} />
            <SummaryCard label="Empresas atualizadas" value={result.companiesUpdated} />
            <SummaryCard label="Certificados criados" value={result.certificatesCreated} />
            <SummaryCard label="Duplicidades ignoradas" value={result.duplicates} />
            <SummaryCard label="Conflitos" value={result.conflicts} warn={result.conflicts > 0} />
            <SummaryCard label="Erros" value={result.errors} warn={result.errors > 0} />
          </div>

          <RowsTable rows={result.rows} />

          <div className="flex gap-2">
            <Button onClick={reset}>Nova importação</Button>
            <Link href="/importar/historico" className="text-sm text-slate-600 underline">
              Ver histórico de importações
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-md border bg-white px-3 py-2.5 ${warn && value > 0 ? "border-amber-300" : "border-slate-200"}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${warn && value > 0 ? "text-amber-700" : "text-slate-900"}`}>
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}

function RowsTable({
  rows,
  resolutions,
  onResolutionChange,
}: {
  rows: ImportRowOutcome[];
  resolutions?: Record<string, RowResolution>;
  onResolutionChange?: (updater: (prev: Record<string, RowResolution>) => Record<string, RowResolution>) => void;
}) {
  const notable = rows.filter((r) => r.result !== "skipped");
  if (notable.length === 0) return null;

  return (
    <div className="max-h-96 overflow-y-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-slate-50">
          <tr className="border-b border-slate-100 uppercase tracking-wide text-slate-400">
            <th className="px-3 py-2">Linha</th>
            <th className="px-3 py-2">Resultado</th>
            <th className="px-3 py-2">Detalhes</th>
            {onResolutionChange && <th className="px-3 py-2">Resolução</th>}
          </tr>
        </thead>
        <tbody>
          {notable.map((row) => {
            const key = String(row.rowNumber);
            const chosen: RowResolution = resolutions?.[key] ?? "keep_existing";
            return (
              <tr key={row.rowNumber} className="border-b border-slate-50 last:border-0">
                <td className="px-3 py-1.5 text-slate-500">{row.rowNumber}</td>
                <td className={`px-3 py-1.5 font-medium ${RESULT_COLORS[row.result]}`}>
                  {row.result === "error" || row.result === "conflict" ? (
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle size={12} /> {RESULT_LABELS[row.result]}
                    </span>
                  ) : (
                    RESULT_LABELS[row.result]
                  )}
                </td>
                <td className="px-3 py-1.5 text-slate-600">{row.message ?? "-"}</td>
                {onResolutionChange && (
                  <td className="px-3 py-1.5">
                    {row.conflict?.field === "code" && (
                      <div className="inline-flex overflow-hidden rounded border border-slate-200">
                        <button
                          type="button"
                          title={`Manter código já cadastrado (${row.conflict.existingValue})`}
                          onClick={() =>
                            onResolutionChange((prev) => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            })
                          }
                          className={`px-2 py-1 ${
                            chosen === "keep_existing" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          Manter existente ({row.conflict.existingValue})
                        </button>
                        <button
                          type="button"
                          title={`Usar o código da planilha (${row.conflict.importedValue})`}
                          onClick={() =>
                            onResolutionChange((prev) => ({ ...prev, [key]: "use_imported" }))
                          }
                          className={`border-l border-slate-200 px-2 py-1 ${
                            chosen === "use_imported" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          Usar da planilha ({row.conflict.importedValue})
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
