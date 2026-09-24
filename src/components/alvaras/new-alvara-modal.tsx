"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, UploadCloud, FileText } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Select, Textarea } from "@/components/ui/input";
import { formatDocument } from "@/lib/documents/document";
import { withBasePath } from "@/lib/utils/base-path";
import { createAlvaraStandalone } from "@/lib/alvaras/actions";
import type { Company, AlvaraType } from "@/lib/types/database";

export function NewAlvaraModal({
  types,
  open,
  onOpenChange,
  initialFile,
}: {
  types: AlvaraType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFile: File | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createAlvaraStandalone, {});
  const errors = state.fieldErrors ?? {};

  const [companyMode, setCompanyMode] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [statusMode, setStatusMode] = useState<"pendente" | "com_data" | "definitivo">("pendente");
  const [file, setFile] = useState<File | null>(initialFile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
      router.refresh();
    }
  }, [state.success, onOpenChange, router]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      const res = await fetch(withBasePath(`/api/search?q=${encodeURIComponent(query)}`));
      const data = await res.json();
      setResults(data.results ?? []);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  function handleClose() {
    setSelectedCompany(null);
    setQuery("");
    setResults([]);
    setCompanyMode("existing");
    setStatusMode("pendente");
    setFile(null);
    onOpenChange(false);
  }

  return (
    <Modal open={open} onClose={handleClose} title="Novo alvará">
      <form action={formAction} className="space-y-5">
        {state.error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {state.error}
          </div>
        )}

        <input type="hidden" name="company_mode" value={companyMode} />
        {selectedCompany && <input type="hidden" name="company_id" value={selectedCompany.id} />}

        <div>
          <div className="mb-2 flex rounded-md border border-slate-200 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setCompanyMode("existing")}
              className={`flex-1 rounded px-2 py-1.5 font-medium ${companyMode === "existing" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Cliente já cadastrado
            </button>
            <button
              type="button"
              onClick={() => setCompanyMode("new")}
              className={`flex-1 rounded px-2 py-1.5 font-medium ${companyMode === "new" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Novo cliente
            </button>
          </div>

          {companyMode === "existing" ? (
            selectedCompany ? (
              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{selectedCompany.corporate_name}</p>
                  <p className="text-xs text-slate-500">
                    Código {selectedCompany.code} · {formatDocument(selectedCompany.document)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCompany(null)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nome, CNPJ, CPF ou código..."
                    className="w-full rounded-md border-0 bg-slate-100 py-2 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                {results.length > 0 && (
                  <ul className="mt-1 max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
                    {results.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompany(c);
                            setQuery("");
                            setResults([]);
                          }}
                          className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-900">{c.corporate_name}</span>
                          <span className="text-xs text-slate-500">
                            Código {c.code} · {formatDocument(c.document)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <FieldError>{errors.company_id}</FieldError>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="new_code" required>
                  Código
                </Label>
                <Input id="new_code" name="new_code" />
                <FieldError>{errors.new_code}</FieldError>
              </div>
              <div>
                <Label htmlFor="new_document" required>
                  CNPJ/CPF
                </Label>
                <Input id="new_document" name="new_document" />
                <FieldError>{errors.new_document}</FieldError>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="new_corporate_name" required>
                  Razão social
                </Label>
                <Input id="new_corporate_name" name="new_corporate_name" />
                <FieldError>{errors.new_corporate_name}</FieldError>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="type_id" required>
              Tipo de alvará
            </Label>
            <Select id="type_id" name="type_id" defaultValue="" required>
              <option value="" disabled>
                Selecione...
              </option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <FieldError>{errors.type_id}</FieldError>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
              <input type="checkbox" name="prioritario" className="h-3.5 w-3.5 rounded border-slate-300" />
              Prioritário
            </label>
          </div>
        </div>

        <div>
          <Label required>Situação</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="radio"
                name="status_mode"
                value="pendente"
                checked={statusMode === "pendente"}
                onChange={() => setStatusMode("pendente")}
              />
              Pendente (sem data)
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="radio"
                name="status_mode"
                value="com_data"
                checked={statusMode === "com_data"}
                onChange={() => setStatusMode("com_data")}
              />
              Emitido, com vencimento
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="radio"
                name="status_mode"
                value="definitivo"
                checked={statusMode === "definitivo"}
                onChange={() => setStatusMode("definitivo")}
              />
              Definitivo (nunca vence)
            </label>
          </div>
        </div>

        {statusMode === "pendente" && (
          <div>
            <Label htmlFor="manual_status">Situação pendente</Label>
            <Select id="manual_status" name="manual_status" defaultValue="AGUARDANDO">
              <option value="AGUARDANDO">Aguardando</option>
              <option value="CGSIM">CGSIM</option>
              <option value="TERCEIROS">Terceiros</option>
            </Select>
          </div>
        )}

        {(statusMode === "com_data" || statusMode === "definitivo") && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="issued_at">Data de emissão</Label>
              <Input id="issued_at" name="issued_at" type="date" />
              <FieldError>{errors.issued_at}</FieldError>
            </div>
            {statusMode === "com_data" && (
              <div>
                <Label htmlFor="valid_to" required>
                  Vencimento
                </Label>
                <Input id="valid_to" name="valid_to" type="date" />
                <FieldError>{errors.valid_to}</FieldError>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="municipality">Município</Label>
            <Input id="municipality" name="municipality" />
          </div>
          <div>
            <Label htmlFor="uf">UF</Label>
            <Input id="uf" name="uf" maxLength={2} />
            <FieldError>{errors.uf}</FieldError>
          </div>
          <div>
            <Label htmlFor="metragem_m2">Metragem em m²</Label>
            <Input id="metragem_m2" name="metragem_m2" type="number" min={0} step="0.01" />
            <FieldError>{errors.metragem_m2}</FieldError>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Lembretes</Label>
          <Textarea id="notes" name="notes" rows={2} />
        </div>

        <div>
          <Label>Anexo (opcional)</Label>
          {file ? (
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                <FileText size={14} className="shrink-0" />
                <span className="truncate">{file.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-500 hover:border-slate-400">
              <UploadCloud size={14} />
              Arraste um arquivo até aqui ou clique pra selecionar
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
          {/* Mounted as a real file input so the File carries over into the FormData the server action reads. */}
          <FileFormInput file={file} />
        </div>

        <div className="flex gap-2 border-t border-slate-100 pt-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * A native file input can't have its `.files` set from React props directly
 * -- DataTransfer is the only way to hand a File object (e.g. one that came
 * from a drop event, not from this exact input) back to an <input type=file>
 * so it's included when the surrounding <form> submits.
 */
function FileFormInput({ file }: { file: File | null }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!file) {
      ref.current.value = "";
      return;
    }
    const dt = new DataTransfer();
    dt.items.add(file);
    ref.current.files = dt.files;
  }, [file]);

  return <input ref={ref} type="file" name="file" className="hidden" />;
}
