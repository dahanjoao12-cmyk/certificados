"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { createUser, type UserFormState } from "@/lib/users/actions";

export function NewUserForm() {
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(createUser, {});

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
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
        <Label htmlFor="password" required>
          Senha inicial
        </Label>
        <Input id="password" name="password" type="password" minLength={8} required />
      </div>
      <div>
        <Label htmlFor="role">Perfil</Label>
        <Select id="role" name="role" defaultValue="user">
          <option value="user">Usuário</option>
          <option value="admin">Admin</option>
        </Select>
      </div>
      <div className="sm:col-span-4">
        {state.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="mb-2 text-sm text-emerald-600">Usuário criado.</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Criando..." : "Criar usuário"}
        </Button>
      </div>
    </form>
  );
}
