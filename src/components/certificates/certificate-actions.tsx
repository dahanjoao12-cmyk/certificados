"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { archiveCertificate, restoreCertificate } from "@/lib/certificates/actions";

export function CertificateActions({
  certificateId,
  companyId,
  archived,
}: {
  certificateId: string;
  companyId: string;
  archived: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/empresas/${companyId}/certificados/${certificateId}/editar`}
        title="Editar"
        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <Pencil size={14} />
      </Link>
      {archived ? (
        <button
          type="button"
          title="Restaurar"
          disabled={isPending}
          onClick={() => startTransition(() => restoreCertificate(certificateId, companyId))}
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700"
        >
          <ArchiveRestore size={14} />
        </button>
      ) : (
        <button
          type="button"
          title="Arquivar"
          disabled={isPending}
          onClick={() => {
            if (confirm("Arquivar este certificado?")) {
              startTransition(() => archiveCertificate(certificateId, companyId));
            }
          }}
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-700"
        >
          <Archive size={14} />
        </button>
      )}
    </div>
  );
}
