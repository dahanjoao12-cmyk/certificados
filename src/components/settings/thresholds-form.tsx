"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { saveCertificateThresholds, type SettingsFormState } from "@/lib/settings/actions";
import type { CertificateThresholdSettings } from "@/lib/types/database";

const ALERT_OPTIONS = [60, 30, 15, 7, 1];

export function ThresholdsForm({
  thresholds,
  readOnly,
}: {
  thresholds: CertificateThresholdSettings;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(saveCertificateThresholds, {});

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
          Configurações salvas.
        </div>
      )}

      <div className="max-w-xs">
        <Label htmlFor="warning_days" required>
          Considerar &quot;vencendo&quot; quando faltarem (dias)
        </Label>
        <Input
          id="warning_days"
          name="warning_days"
          type="number"
          min={1}
          max={365}
          defaultValue={thresholds.warning_days}
          disabled={readOnly}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          Certificados com menos dias restantes que este valor aparecem como &quot;Vencendo&quot;.
        </p>
      </div>

      <div>
        <Label>Dias de alerta (para notificações futuras)</Label>
        <div className="flex flex-wrap gap-3">
          {ALERT_OPTIONS.map((day) => (
            <label key={day} className="flex items-center gap-1.5 text-sm text-slate-700">
              <input
                type="checkbox"
                name="alert_days"
                value={day}
                defaultChecked={thresholds.alert_days.includes(day)}
                disabled={readOnly}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              {day} dias
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Ainda não enviamos notificações automáticas -- estes valores já ficam salvos para quando o envio (sistema,
          e-mail, WhatsApp) for implementado.
        </p>
      </div>

      {!readOnly && (
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar configurações"}
        </Button>
      )}
      {readOnly && <p className="text-xs text-slate-400">Apenas administradores podem alterar estas configurações.</p>}
    </form>
  );
}
