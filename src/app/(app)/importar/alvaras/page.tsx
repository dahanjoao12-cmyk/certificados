import Link from "next/link";
import { AlvaraImportWizard } from "@/components/alvaras/import-wizard";

export default function ImportAlvarasPage() {
  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Importar alvarás</h1>
          <p className="text-sm text-slate-500">
            Envie a planilha de alvarás. O CNPJ/CPF de cada linha precisa já existir em Clientes -- este import nunca
            cria uma empresa nova.
          </p>
        </div>
        <Link href="/importar" className="text-sm text-slate-600 underline">
          Importar empresas/certificados
        </Link>
      </div>

      <AlvaraImportWizard />
    </div>
  );
}
