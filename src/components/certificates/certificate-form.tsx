"use client";

import { useActionState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label, FieldError, Select, Textarea } from "@/components/ui/input";
import type { Certificate } from "@/lib/types/database";
import type { CertificateFormState } from "@/lib/certificates/actions";

type Action = (prevState: CertificateFormState, formData: FormData) => Promise<CertificateFormState>;

export function CertificateForm({
  action,
  certificate,
  companyId,
  isRenewal,
}: {
  action: Action;
  certificate?: Certificate;
  companyId: string;
  isRenewal?: boolean;
}) {
  const [state, formAction, pending] = useActionState<CertificateFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {isRenewal && (
        <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
          Esta empresa já possui um certificado vigente. Ao salvar, o certificado atual será mantido no histórico e
          este novo registro passará a ser o certificado vigente.
        </div>
      )}
      {state.error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="type" required>
            Tipo
          </Label>
          <Select id="type" name="type" defaultValue={certificate?.type ?? "e-cnpj"} required>
            <option value="e-cnpj">e-CNPJ</option>
            <option value="e-cpf">e-CPF</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="model" required>
            Modelo
          </Label>
          <Select id="model" name="model" defaultValue={certificate?.model ?? "A1"} required>
            <option value="A1">A1</option>
            <option value="A3">A3</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="valid_from">Início da validade</Label>
          <Input id="valid_from" name="valid_from" type="date" defaultValue={certificate?.valid_from ?? ""} />
        </div>
        <div>
          <Label htmlFor="valid_to" required>
            Vencimento
          </Label>
          <Input id="valid_to" name="valid_to" type="date" defaultValue={certificate?.valid_to ?? ""} required />
          <FieldError>{errors.valid_to}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="certificate_authority">Autoridade certificadora</Label>
        <Input id="certificate_authority" name="certificate_authority" defaultValue={certificate?.certificate_authority ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="serial_number">Número de série</Label>
          <Input id="serial_number" name="serial_number" defaultValue={certificate?.serial_number ?? ""} />
        </div>
        <div>
          <Label htmlFor="algorithm">Algoritmo</Label>
          <Input id="algorithm" name="algorithm" defaultValue={certificate?.algorithm ?? ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" defaultValue={certificate?.subject ?? ""} />
      </div>
      <div>
        <Label htmlFor="issuer">Issuer</Label>
        <Input id="issuer" name="issuer" defaultValue={certificate?.issuer ?? ""} />
      </div>
      <div>
        <Label htmlFor="fingerprint">Fingerprint</Label>
        <Input id="fingerprint" name="fingerprint" defaultValue={certificate?.fingerprint ?? ""} />
      </div>
      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={certificate?.notes ?? ""} />
      </div>

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <ButtonLink href={`/empresas/${companyId}`} variant="secondary">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
