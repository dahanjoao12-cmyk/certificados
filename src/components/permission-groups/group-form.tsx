"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AVAILABLE_MODULES } from "@/lib/permission-groups/modules";
import type { GroupFormState } from "@/lib/permission-groups/actions";
import type { PermissionGroupWithModules } from "@/lib/permission-groups/queries";

type Action = (prevState: GroupFormState, formData: FormData) => Promise<GroupFormState>;

export function GroupForm({
  action,
  group,
  onSaved,
}: {
  action: Action;
  group?: PermissionGroupWithModules;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState<GroupFormState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result.success) onSaved?.();
    return result;
  }, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {state.error}
        </div>
      )}

      <div>
        <Label htmlFor="name" required>
          Nome do grupo
        </Label>
        <Input id="name" name="name" defaultValue={group?.name} required />
      </div>

      <div>
        <Label>Módulos que este grupo cobre</Label>
        <p className="mb-2 text-xs text-slate-500">
          Só cadastro por enquanto — nenhuma tela ainda restringe acesso com base nisso.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_MODULES.map((mod) => (
            <label key={mod.key} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="module_keys"
                value={mod.key}
                defaultChecked={group?.module_keys.includes(mod.key)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              {mod.label}
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar grupo"}
      </Button>
    </form>
  );
}
