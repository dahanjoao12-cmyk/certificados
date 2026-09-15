"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { sendDigestNow, type DigestFormState } from "@/lib/settings/actions";

const initialState: DigestFormState = {};

export function SendDigestButton() {
  const [state, formAction, pending] = useActionState(sendDigestNow, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Enviando..." : "Enviar notificações por e-mail agora"}
      </Button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
    </form>
  );
}
