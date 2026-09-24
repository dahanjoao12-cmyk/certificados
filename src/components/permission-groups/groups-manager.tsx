"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { GroupForm } from "./group-form";
import { createPermissionGroup, updatePermissionGroup, deletePermissionGroup } from "@/lib/permission-groups/actions";
import { AVAILABLE_MODULES } from "@/lib/permission-groups/modules";
import type { PermissionGroupWithModules } from "@/lib/permission-groups/queries";

export function GroupsManager({ groups }: { groups: PermissionGroupWithModules[] }) {
  const [modalGroup, setModalGroup] = useState<PermissionGroupWithModules | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  function moduleLabels(keys: string[]): string {
    if (keys.length === 0) return "Nenhum módulo selecionado";
    return AVAILABLE_MODULES.filter((m) => keys.includes(m.key))
      .map((m) => m.label)
      .join(", ");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Cadastro de grupos e quais módulos cada um cobre.</p>
        <Button size="sm" onClick={() => setModalGroup("new")}>
          <Plus size={14} /> Novo grupo
        </Button>
      </div>

      <div className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
        {groups.map((group) => (
          <div key={group.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{group.name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{moduleLabels(group.module_keys)}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {group.member_count} usuário{group.member_count === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                title="Editar"
                onClick={() => setModalGroup(group)}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                title="Excluir"
                disabled={isPending}
                onClick={() => {
                  if (confirm(`Excluir o grupo "${group.name}"? Usuários deste grupo ficam sem grupo.`)) {
                    startTransition(() => deletePermissionGroup(group.id));
                  }
                }}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Nenhum grupo cadastrado ainda.</p>
        )}
      </div>

      <Modal
        open={modalGroup !== null}
        onClose={() => setModalGroup(null)}
        title={modalGroup === "new" ? "Novo grupo" : `Editar grupo: ${modalGroup?.name ?? ""}`}
      >
        {modalGroup === "new" ? (
          <GroupForm action={createPermissionGroup} onSaved={() => setModalGroup(null)} />
        ) : modalGroup ? (
          <GroupForm
            action={updatePermissionGroup.bind(null, modalGroup.id)}
            group={modalGroup}
            onSaved={() => setModalGroup(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
