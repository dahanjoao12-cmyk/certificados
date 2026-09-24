"use client";

import { useActionState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label, FieldError, Select, Textarea } from "@/components/ui/input";
import type { Company } from "@/lib/types/database";
import type { CompanyFormState } from "@/lib/companies/actions";

type Action = (prevState: CompanyFormState, formData: FormData) => Promise<CompanyFormState>;

export function CompanyForm({
  action,
  company,
  users,
  onCancel,
}: {
  action: Action;
  company?: Company;
  /** Active users, for the "Responsável" dropdown. */
  users: { id: string; full_name: string }[];
  /** When set (e.g. rendered inside a modal), replaces the "Cancelar" link with a plain close callback. */
  onCancel?: () => void;
}) {
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="state_registration">Inscrição Estadual</Label>
          <Input id="state_registration" name="state_registration" defaultValue={company?.state_registration ?? ""} />
        </div>
        <div>
          <Label htmlFor="municipal_tax_registration">Inscrição Fiscal Municipal</Label>
          <Input
            id="municipal_tax_registration"
            name="municipal_tax_registration"
            defaultValue={company?.municipal_tax_registration ?? ""}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="responsible_user_id">Responsável</Label>
        <Select id="responsible_user_id" name="responsible_user_id" defaultValue={company?.responsible_user_id ?? ""}>
          <option value="">Nenhum — visível para todos</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </Select>
        {company?.responsible && !company.responsible_user_id && (
          <p className="mt-1 text-xs text-slate-500">
            Responsável anterior (texto livre): <span className="font-medium">{company.responsible}</span> — selecione
            um usuário acima para atualizar.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input id="whatsapp" name="whatsapp" defaultValue={company?.whatsapp ?? ""} placeholder="(21) 99999-9999" />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={company?.email ?? ""} />
          <FieldError>{errors.email}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" defaultValue={company?.phone ?? ""} />
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Endereço</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="zip_code">CEP</Label>
            <Input id="zip_code" name="zip_code" defaultValue={company?.zip_code ?? ""} placeholder="00000-000" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address_street">Logradouro</Label>
            <Input id="address_street" name="address_street" defaultValue={company?.address_street ?? ""} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="address_number">Número</Label>
            <Input id="address_number" name="address_number" defaultValue={company?.address_number ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address_complement">Complemento</Label>
            <Input id="address_complement" name="address_complement" defaultValue={company?.address_complement ?? ""} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input id="neighborhood" name="neighborhood" defaultValue={company?.neighborhood ?? ""} />
          </div>
          <div>
            <Label htmlFor="municipality">Cidade</Label>
            <Input id="municipality" name="municipality" defaultValue={company?.municipality ?? ""} />
          </div>
          <div>
            <Label htmlFor="uf">UF</Label>
            <Input id="uf" name="uf" maxLength={2} defaultValue={company?.uf ?? ""} />
            <FieldError>{errors.uf}</FieldError>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={company?.notes ?? ""} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="active" defaultChecked={company?.active ?? true} className="h-4 w-4 rounded border-slate-300" />
        Cliente ativo
      </label>

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        ) : (
          <ButtonLink href={company ? `/clientes/${company.id}` : "/clientes"} variant="secondary">
            Cancelar
          </ButtonLink>
        )}
      </div>
    </form>
  );
}
