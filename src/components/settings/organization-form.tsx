"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { saveOrganizationInfo, type SettingsFormState } from "@/lib/settings/actions";
import { formatDocument } from "@/lib/documents/document";
import type { OrganizationInfo } from "@/lib/types/database";

export function OrganizationForm({
  organization,
  readOnly,
}: {
  organization: OrganizationInfo;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(saveOrganizationInfo, {});
  const cnpjLocked = Boolean(organization.cnpj);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
          Dados salvos.
        </div>
      )}

      <div>
        <Label htmlFor="cnpj" required>
          CNPJ
        </Label>
        <Input
          id="cnpj"
          name="cnpj"
          defaultValue={cnpjLocked ? formatDocument(organization.cnpj) : ""}
          disabled={cnpjLocked || readOnly}
          placeholder="00.000.000/0000-00"
          required={!cnpjLocked}
        />
        {cnpjLocked && (
          <p className="mt-1 text-xs text-slate-500">Para corrigir o CNPJ, entre em contato com o suporte.</p>
        )}
      </div>

      <div>
        <Label htmlFor="corporate_name" required>
          Razão Social
        </Label>
        <Input id="corporate_name" name="corporate_name" defaultValue={organization.corporate_name ?? ""} disabled={readOnly} required />
      </div>

      <div>
        <Label htmlFor="trade_name">Nome Fantasia</Label>
        <Input id="trade_name" name="trade_name" defaultValue={organization.trade_name ?? ""} disabled={readOnly} />
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Endereço</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="zip_code">CEP</Label>
            <Input id="zip_code" name="zip_code" defaultValue={organization.zip_code ?? ""} disabled={readOnly} placeholder="00000-000" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address_street">Logradouro</Label>
            <Input id="address_street" name="address_street" defaultValue={organization.address_street ?? ""} disabled={readOnly} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="address_number">Número</Label>
            <Input id="address_number" name="address_number" defaultValue={organization.address_number ?? ""} disabled={readOnly} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address_complement">Complemento</Label>
            <Input
              id="address_complement"
              name="address_complement"
              defaultValue={organization.address_complement ?? ""}
              disabled={readOnly}
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input id="neighborhood" name="neighborhood" defaultValue={organization.neighborhood ?? ""} disabled={readOnly} />
          </div>
          <div>
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" name="city" defaultValue={organization.city ?? ""} disabled={readOnly} />
          </div>
          <div>
            <Label htmlFor="uf">Estado (UF)</Label>
            <Input id="uf" name="uf" maxLength={2} defaultValue={organization.uf ?? ""} disabled={readOnly} />
          </div>
        </div>
      </div>

      {!readOnly && (
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
      )}
      {readOnly && <p className="text-xs text-slate-400">Apenas administradores podem alterar estes dados.</p>}
    </form>
  );
}
