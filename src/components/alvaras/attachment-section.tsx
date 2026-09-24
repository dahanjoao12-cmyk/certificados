"use client";

import { useActionState, useTransition } from "react";
import { Paperclip, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/utils/base-path";
import { uploadAlvaraAttachment, removeAlvaraAttachment, type AttachmentFormState } from "@/lib/alvaras/attachments";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentSection({
  alvaraId,
  companyId,
  attachmentName,
  attachmentSize,
  sharedFromMunicipality,
}: {
  alvaraId: string;
  companyId: string;
  attachmentName: string | null;
  attachmentSize: number | null;
  sharedFromMunicipality?: boolean;
}) {
  const uploadAction = uploadAlvaraAttachment.bind(null, alvaraId, companyId);
  const [state, formAction, pending] = useActionState<AttachmentFormState, FormData>(uploadAction, {});
  const [removing, startRemoving] = useTransition();

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-700">
        <Paperclip size={13} /> Anexo (PDF, JPG, PNG ou WEBP -- máx. 10MB)
      </p>

      {sharedFromMunicipality && (
        <p className="mb-2 text-xs text-slate-500">
          Usando o anexo comum já cadastrado para este município (TLE) -- envie um arquivo abaixo só se este alvará
          precisar de um anexo próprio, diferente dos demais.
        </p>
      )}

      {attachmentName ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-slate-900">{attachmentName}</p>
            {attachmentSize !== null && <p className="text-xs text-slate-500">{formatSize(attachmentSize)}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={withBasePath(`/api/alvaras/${alvaraId}/attachment`)}
              target="_blank"
              rel="noreferrer"
              title="Baixar"
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <Download size={14} />
            </a>
            {!sharedFromMunicipality && (
              <button
                type="button"
                title="Remover"
                disabled={removing}
                onClick={() => {
                  if (confirm("Remover o anexo deste alvará?")) {
                    startRemoving(() => removeAlvaraAttachment(alvaraId, companyId));
                  }
                }}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="mb-2 text-xs text-slate-500">Nenhum arquivo anexado ainda.</p>
      )}

      <form action={formAction} className="mt-2 flex items-center gap-2">
        <input
          type="file"
          name="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          required
          className="flex-1 text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-900 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-white"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Enviando..." : attachmentName ? "Substituir" : "Enviar"}
        </Button>
      </form>
      {state.error && <p className="mt-1.5 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
