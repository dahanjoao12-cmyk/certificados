"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { createUser, type UserFormState } from "@/lib/users/actions";

export function NewUserForm() {
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(createUser, {});

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div>
        <Label htmlFor="full_name" required>
          Nome
        </Label>
        <Input id="full_name" name="full_name" required />
      </div>
      <div>
        <Label htmlFor="email" required>
          E-mail
        </Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="role">Perfil</Label>
        <Select id="role" name="role" defaultValue="user">
          <option value="user">Usuário</option>
          <option value="admin">Admin</option>
        </Select>
      </div>
      <div className="sm:col-span-3">
        <p className="mb-2 text-xs text-slate-500">
          Um e-mail de convite é enviado para a pessoa definir a própria senha e entrar.
        </p>
        {state.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="mb-2 text-sm text-emerald-600">Convite enviado.</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando..." : "Enviar convite"}
        </Button>
      </div>
    </form>
  );
}
