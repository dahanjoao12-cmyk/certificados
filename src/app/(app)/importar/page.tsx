import Link from "next/link";
import { ImportWizard } from "@/components/import/import-wizard";

export default function ImportPage() {
  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Importar planilha</h1>
          <p className="text-sm text-slate-500">
            Envie uma planilha de cadastro ou de certificados. Você escolhe o mapeamento das colunas no próximo passo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/importar/alvaras" className="text-sm text-slate-600 underline">
            Importar alvarás
          </Link>
          <Link href="/importar/historico" className="text-sm text-slate-600 underline">
            Histórico de importações
          </Link>
        </div>
      </div>

      <ImportWizard />
    </div>
  );
}
