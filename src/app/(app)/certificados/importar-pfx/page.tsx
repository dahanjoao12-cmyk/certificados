import { PfxImportWizard } from "@/components/certificates/pfx-import-wizard";

export default function PfxImportPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Processar certificado A1 (.pfx/.p12)</h1>
        <p className="text-sm text-slate-500">
          Extraia os metadados de um certificado A1 e vincule a uma empresa já cadastrada.
        </p>
      </div>
      <PfxImportWizard />
    </div>
  );
}
