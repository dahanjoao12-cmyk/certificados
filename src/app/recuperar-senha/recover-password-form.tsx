"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type RequestPasswordResetState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: RequestPasswordResetState = {};

export function RecoverPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.success) {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
          Se esse e-mail estiver cadastrado, você vai receber um link para redefinir a senha em poucos minutos.
        </p>
        <Link href="/login" className="text-sm text-slate-600 underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar link de redefinição"}
      </Button>
      <Link href="/login" className="block text-center text-sm text-slate-500 hover:text-slate-700">
        Voltar para o login
      </Link>
    </form>
  );
}
