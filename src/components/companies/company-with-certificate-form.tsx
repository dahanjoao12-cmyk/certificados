"use client";

import { useActionState, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label, FieldError, Select, Textarea } from "@/components/ui/input";
import { createCompanyWithCertificate } from "@/lib/companies/actions";
import type { CompanyFormState } from "@/lib/companies/actions";

const DURATION_OPTIONS = [
  { value: "1", label: "1 ano" },
  { value: "2", label: "2 anos" },
  { value: "3", label: "3 anos" },
  { value: "5", label: "5 anos" },
  { value: "custom", label: "Data personalizada" },
];

export function CompanyWithCertificateForm({
  defaultWarningDays,
  onCancel,
}: {
  defaultWarningDays: number;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState<CompanyFormState, FormData>(createCompanyWithCertificate, {});
  const errors = state.fieldErrors ?? {};
  const [duration, setDuration] = useState("1");

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {state.error}
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Empresa</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="code" required>
                Código interno
              </Label>
              <Input id="code" name="code" required />
              <FieldError>{errors.code}</FieldError>
            </div>
            <div>
              <Label htmlFor="document" required>
                CNPJ/CPF
              </Label>
              <Input id="document" name="document" placeholder="00.000.000/0000-00" required />
              <FieldError>{errors.document}</FieldError>
            </div>
          </div>

          <div>
            <Label htmlFor="corporate_name" required>
              Razão social
            </Label>
            <Input id="corporate_name" name="corporate_name" required />
            <FieldError>{errors.corporate_name}</FieldError>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="trade_name">Nome fantasia</Label>
              <Input id="trade_name" name="trade_name" />
            </div>
            <div>
              <Label htmlFor="short_name">Nome abreviado</Label>
              <Input id="short_name" name="short_name" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor="municipality">Município</Label>
              <Input id="municipality" name="municipality" />
            </div>
            <div>
              <Label htmlFor="uf">UF</Label>
              <Input id="uf" name="uf" maxLength={2} />
              <FieldError>{errors.uf}</FieldError>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="responsible">Responsável interno</Label>
              <Input id="responsible" name="responsible" />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" />
              <FieldError>{errors.email}</FieldError>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4 rounded border-slate-300" />
            Empresa ativa
          </label>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Certificado</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cert_type" required>
                Tipo
              </Label>
              <Select id="cert_type" name="cert_type" defaultValue="e-cnpj" required>
                <option value="e-cnpj">e-CNPJ</option>
                <option value="e-cpf">e-CPF</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="cert_model" required>
                Modelo
              </Label>
              <Select id="cert_model" name="cert_model" defaultValue="A1" required>
                <option value="A1">A1</option>
                <option value="A3">A3</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="duration" required>
                Validade
              </Label>
              <Select id="duration" name="duration" value={duration} onChange={(e) => setDuration(e.target.value)} required>
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-slate-500">Conta a partir de hoje.</p>
            </div>
            {duration === "custom" && (
              <div>
                <Label htmlFor="valid_to_custom" required>
                  Data de vencimento
                </Label>
                <Input id="valid_to_custom" name="valid_to_custom" type="date" required />
                <FieldError>{errors.valid_to_custom}</FieldError>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="warning_days">Avisar quando estiver vencendo em (dias)</Label>
            <Input id="warning_days" name="warning_days" type="number" min={1} placeholder={`Padrão: ${defaultWarningDays} dias`} />
            <p className="mt-1 text-xs text-slate-500">Deixe em branco para usar o padrão do sistema.</p>
            <FieldError>{errors.warning_days}</FieldError>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        ) : (
          <ButtonLink href="/empresas" variant="secondary">
            Cancelar
          </ButtonLink>
        )}
      </div>
    </form>
  );
}
