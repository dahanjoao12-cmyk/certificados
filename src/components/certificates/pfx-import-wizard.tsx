"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UploadCloud, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { formatDocument } from "@/lib/documents/document";
import type { Company } from "@/lib/types/database";
import type { PfxMetadata } from "@/lib/pfx/parse";

type Step = "upload" | "confirm" | "done";

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function PfxImportWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metadata, setMetadata] = useState<PfxMetadata | null>(null);
  const [matchedCompany, setMatchedCompany] = useState<Company | null>(null);
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [model, setModel] = useState<"A1" | "A3">("A1");

  async function handleAnalyze() {
    if (!file || !password) {
      setError("Selecione o arquivo e informe a senha.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("password", password);
      const res = await fetch("/api/certificates/pfx/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao processar o certificado.");
      setMetadata(data.metadata);
      setMatchedCompany(data.matchedCompany);
      setSelectedCompany(data.matchedCompany);
      setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao processar o certificado.");
    } finally {
      setPassword("");
      setLoading(false);
    }
  }

  async function handleManualSearch(query: string) {
    setManualQuery(query);
    if (query.trim().length < 2) {
      setManualResults([]);
      return;
    }
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setManualResults(data.results ?? []);
  }

  async function handleConfirm() {
    if (!metadata || !selectedCompany) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/certificates/pfx/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: selectedCompany.id, metadata, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar o certificado.");
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar o certificado.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done" && selectedCompany) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-3 text-emerald-800 ring-1 ring-inset ring-emerald-200">
          <CheckCircle2 size={18} />
          <p className="text-sm font-medium">Certificado cadastrado para {selectedCompany.corporate_name}.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/empresas/${selectedCompany.id}`)}>Ver empresa</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setStep("upload");
              setFile(null);
              setMetadata(null);
              setMatchedCompany(null);
              setSelectedCompany(null);
              setManualQuery("");
              setManualResults([]);
            }}
          >
            Importar outro certificado
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
        <p className="flex items-center gap-1.5 font-medium text-slate-700">
          <ShieldCheck size={14} /> Como isso funciona
        </p>
        <p className="mt-1">
          O arquivo e a senha são enviados apenas para processamento no servidor. Extraímos os metadados do
          certificado (validade, emissor, número de série, etc.) e descartamos o arquivo e a senha em seguida.
          A chave privada nunca é extraída, armazenada ou reutilizada.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">{error}</div>
      )}

      {step === "upload" && (
        <div className="space-y-4 rounded-md border border-slate-200 bg-white p-5">
          <div>
            <Label htmlFor="pfx-file" required>
              Arquivo do certificado (.pfx ou .p12)
            </Label>
            <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-slate-400">
              <UploadCloud size={15} />
              {file ? file.name : "Selecionar arquivo"}
              <input
                id="pfx-file"
                type="file"
                accept=".pfx,.p12"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div>
            <Label htmlFor="pfx-password" required>
              Senha do certificado
            </Label>
            <Input
              id="pfx-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleAnalyze} disabled={loading}>
            {loading ? "Processando..." : "Processar certificado"}
          </Button>
        </div>
      )}

      {step === "confirm" && metadata && (
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Dados extraídos do certificado</h2>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Field label="Subject" value={metadata.subject} />
              <Field label="Issuer" value={metadata.issuer} />
              <Field label="Número de série" value={metadata.serialNumber} />
              <Field label="Válido de" value={formatDate(metadata.validFrom)} />
              <Field label="Válido até" value={formatDate(metadata.validTo)} />
              <Field label="Algoritmo" value={metadata.signatureAlgorithm ?? "-"} />
              <Field label="Fingerprint (SHA-1)" value={metadata.fingerprintSha1} mono />
              <Field
                label="CNPJ/CPF identificado"
                value={metadata.extractedDocument ? formatDocument(metadata.extractedDocument) : "Não identificado automaticamente"}
              />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Empresa</h2>
            {matchedCompany ? (
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
                Empresa encontrada automaticamente: <strong>{matchedCompany.corporate_name}</strong> (código{" "}
                {matchedCompany.code})
              </div>
            ) : (
              <p className="mb-2 text-sm text-slate-500">
                Não foi possível identificar a empresa automaticamente. Busque manualmente:
              </p>
            )}

            {!matchedCompany && (
              <div className="mt-2">
                <Input
                  placeholder="Buscar por nome, CNPJ, CPF ou código..."
                  value={manualQuery}
                  onChange={(e) => handleManualSearch(e.target.value)}
                />
                {manualResults.length > 0 && (
                  <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200">
                    {manualResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedCompany(c)}
                          className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                            selectedCompany?.id === c.id ? "bg-slate-50" : ""
                          }`}
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
              </div>
            )}

            <div className="mt-4 max-w-[160px]">
              <Label htmlFor="model">Modelo</Label>
              <Select id="model" value={model} onChange={(e) => setModel(e.target.value as "A1" | "A3")}>
                <option value="A1">A1</option>
                <option value="A3">A3</option>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleConfirm} disabled={loading || !selectedCompany}>
              {loading ? "Salvando..." : "Confirmar e cadastrar certificado"}
            </Button>
            <Button variant="ghost" onClick={() => setStep("upload")}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-0.5 break-all text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}
