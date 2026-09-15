"use client";

import { useActionState } from "react";
import { setInitialPassword, type SetPasswordState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: SetPasswordState = {};

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(setInitialPassword, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="password">Nova senha</Label>
        <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required autoFocus />
      </div>
      <div>
        <Label htmlFor="confirm_password">Confirme a senha</Label>
        <Input id="confirm_password" name="confirm_password" type="password" minLength={8} autoComplete="new-password" required />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : "Definir senha e entrar"}
      </Button>
    </form>
  );
}
