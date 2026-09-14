"use client";

import { useActionState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import type { Company } from "@/lib/types/database";
import type { CompanyFormState } from "@/lib/companies/actions";

type Action = (prevState: CompanyFormState, formData: FormData) => Promise<CompanyFormState>;

export function CompanyForm({ action, company }: { action: Action; company?: Company }) {
  const [state, formAction, pending] = useActionState<CompanyFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code" required>
            Código interno
          </Label>
          <Input id="code" name="code" defaultValue={company?.code} required />
          <FieldError>{errors.code}</FieldError>
        </div>
        <div>
          <Label htmlFor="document" required>
            CNPJ/CPF
          </Label>
          <Input id="document" name="document" defaultValue={company?.document} placeholder="00.000.000/0000-00" required />
          <FieldError>{errors.document}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="corporate_name" required>
          Razão social
        </Label>
        <Input id="corporate_name" name="corporate_name" defaultValue={company?.corporate_name} required />
        <FieldError>{errors.corporate_name}</FieldError>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="trade_name">Nome fantasia</Label>
          <Input id="trade_name" name="trade_name" defaultValue={company?.trade_name ?? ""} />
        </div>
        <div>
          <Label htmlFor="short_name">Nome abreviado</Label>
          <Input id="short_name" name="short_name" defaultValue={company?.short_name ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Label htmlFor="municipality">Município</Label>
          <Input id="municipality" name="municipality" defaultValue={company?.municipality ?? ""} />
        </div>
        <div>
          <Label htmlFor="uf">UF</Label>
          <Input id="uf" name="uf" maxLength={2} defaultValue={company?.uf ?? ""} />
          <FieldError>{errors.uf}</FieldError>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="situation">Situação</Label>
          <Input id="situation" name="situation" defaultValue={company?.situation ?? ""} placeholder="ativa, inativa..." />
        </div>
        <div>
          <Label htmlFor="responsible">Responsável interno</Label>
          <Input id="responsible" name="responsible" defaultValue={company?.responsible ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" defaultValue={company?.phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={company?.email ?? ""} />
          <FieldError>{errors.email}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={company?.notes ?? ""} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="active" defaultChecked={company?.active ?? true} className="h-4 w-4 rounded border-slate-300" />
        Empresa ativa
      </label>

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <ButtonLink href={company ? `/empresas/${company.id}` : "/empresas"} variant="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
