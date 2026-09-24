"use client";

import { useActionState, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label, FieldError, Select, Textarea } from "@/components/ui/input";
import type { Alvara, AlvaraType } from "@/lib/types/database";
import type { AlvaraFormState } from "@/lib/alvaras/actions";

type Action = (prevState: AlvaraFormState, formData: FormData) => Promise<AlvaraFormState>;

function initialStatusMode(alvara?: Alvara): "pendente" | "definitivo" | "com_data" {
  if (!alvara) return "pendente";
  if (!alvara.issued) return "pendente";
  return alvara.is_permanent ? "definitivo" : "com_data";
}

export function AlvaraForm({
  action,
  alvara,
  types,
  companyId,
}: {
  action: Action;
  alvara?: Alvara;
  types: AlvaraType[];
  companyId: string;
}) {
  const [state, formAction, pending] = useActionState<AlvaraFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};
  const [statusMode, setStatusMode] = useState<"pendente" | "definitivo" | "com_data">(initialStatusMode(alvara));

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {state.error}
        </div>
      )}

      {!alvara && (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
          O anexo de arquivo (PDF/imagem) fica disponível depois de salvar, na tela de edição.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="type_id" required>
            Tipo de alvará
          </Label>
          <Select id="type_id" name="type_id" defaultValue={alvara?.type_id ?? ""} required>
            <option value="" disabled>
              Selecione...
            </option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <FieldError>{errors.type_id}</FieldError>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="prioritario"
              defaultChecked={alvara?.prioritario}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Prioritário
          </label>
        </div>
      </div>

      <div>
        <Label required>Situação</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="radio"
              name="status_mode"
              value="pendente"
              checked={statusMode === "pendente"}
              onChange={() => setStatusMode("pendente")}
            />
            Pendente (sem data)
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="radio"
              name="status_mode"
              value="com_data"
              checked={statusMode === "com_data"}
              onChange={() => setStatusMode("com_data")}
            />
            Emitido, com vencimento
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="radio"
              name="status_mode"
              value="definitivo"
              checked={statusMode === "definitivo"}
              onChange={() => setStatusMode("definitivo")}
            />
            Definitivo (nunca vence)
          </label>
        </div>
      </div>

      {statusMode === "pendente" && (
        <div>
          <Label htmlFor="manual_status">Situação pendente</Label>
          <Select id="manual_status" name="manual_status" defaultValue={alvara?.manual_status ?? "AGUARDANDO"}>
            <option value="AGUARDANDO">Aguardando</option>
            <option value="CGSIM">CGSIM</option>
            <option value="TERCEIROS">Terceiros</option>
          </Select>
        </div>
      )}

      {(statusMode === "com_data" || statusMode === "definitivo") && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="issued_at">Data de emissão</Label>
            <Input id="issued_at" name="issued_at" type="date" defaultValue={alvara?.issued_at ?? ""} />
            <FieldError>{errors.issued_at}</FieldError>
          </div>
          {statusMode === "com_data" && (
            <div>
              <Label htmlFor="valid_to" required>
                Vencimento
              </Label>
              <Input id="valid_to" name="valid_to" type="date" defaultValue={alvara?.valid_to ?? ""} />
              <FieldError>{errors.valid_to}</FieldError>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="municipality">Município</Label>
          <Input id="municipality" name="municipality" defaultValue={alvara?.municipality ?? ""} />
        </div>
        <div>
          <Label htmlFor="uf">UF</Label>
          <Input id="uf" name="uf" maxLength={2} defaultValue={alvara?.uf ?? ""} />
          <FieldError>{errors.uf}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="metragem_m2">Metragem em m²</Label>
        <Input
          id="metragem_m2"
          name="metragem_m2"
          type="number"
          min={0}
          step="0.01"
          defaultValue={alvara?.metragem_m2 ?? ""}
        />
        <FieldError>{errors.metragem_m2}</FieldError>
      </div>

      <div>
        <Label htmlFor="notes">Lembretes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={alvara?.notes ?? ""} />
      </div>

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <ButtonLink href={`/clientes/${companyId}`} variant="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
