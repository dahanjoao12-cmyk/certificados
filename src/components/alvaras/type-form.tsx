"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { AlvaraTypeFormState } from "@/lib/alvaras/catalog";
import type { AlvaraType } from "@/lib/types/database";

type Action = (prevState: AlvaraTypeFormState, formData: FormData) => Promise<AlvaraTypeFormState>;

export function AlvaraTypeForm({
  action,
  type,
  onSaved,
}: {
  action: Action;
  type?: AlvaraType;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState<AlvaraTypeFormState, FormData>(async (prev, formData) => {
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
          Nome do tipo
        </Label>
        <Input id="name" name="name" defaultValue={type?.name} required />
      </div>

      <div>
        <Label htmlFor="color">Cor</Label>
        <div className="flex items-center gap-2">
          <input
            id="color"
            name="color"
            type="color"
            defaultValue={type?.color ?? "#2563eb"}
            className="h-9 w-14 rounded border border-slate-300"
          />
          <p className="text-xs text-slate-500">Usada nos chips e no calendário do Dashboard.</p>
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="shared_attachment_by_municipality"
          defaultChecked={type?.shared_attachment_by_municipality}
          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
        />
        <span>
          Anexo compartilhado por município (ex.: TLE)
          <span className="block text-xs text-slate-500">
            O primeiro anexo enviado num alvará deste tipo passa a valer para os demais alvarás do mesmo tipo no
            mesmo município, até que um deles receba um anexo próprio.
          </span>
        </span>
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar tipo"}
      </Button>
    </form>
  );
}
