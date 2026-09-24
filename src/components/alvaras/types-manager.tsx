"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AlvaraTypeForm } from "./type-form";
import { createAlvaraType, updateAlvaraType, deleteAlvaraType } from "@/lib/alvaras/catalog";
import type { AlvaraType } from "@/lib/types/database";

export function AlvaraTypesManager({ types }: { types: AlvaraType[] }) {
  const [modalType, setModalType] = useState<AlvaraType | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Cadastro dos tipos de alvará usados em todo o sistema.</p>
        <Button size="sm" onClick={() => setModalType("new")}>
          <Plus size={14} /> Novo tipo
        </Button>
      </div>

      <div className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
        {types.map((type) => (
          <div key={type.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: type.color }} />
              <p className="truncate text-sm font-medium text-slate-900">{type.name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                title="Editar"
                onClick={() => setModalType(type)}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                title="Excluir"
                disabled={isPending}
                onClick={() => {
                  if (confirm(`Excluir o tipo "${type.name}"?`)) {
                    startTransition(() => deleteAlvaraType(type.id));
                  }
                }}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {types.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Nenhum tipo de alvará cadastrado ainda.</p>
        )}
      </div>

      <Modal
        open={modalType !== null}
        onClose={() => setModalType(null)}
        title={modalType === "new" ? "Novo tipo de alvará" : `Editar tipo: ${modalType?.name ?? ""}`}
      >
        {modalType === "new" ? (
          <AlvaraTypeForm action={createAlvaraType} onSaved={() => setModalType(null)} />
        ) : modalType ? (
          <AlvaraTypeForm action={updateAlvaraType.bind(null, modalType.id)} type={modalType} onSaved={() => setModalType(null)} />
        ) : null}
      </Modal>
    </div>
  );
}
