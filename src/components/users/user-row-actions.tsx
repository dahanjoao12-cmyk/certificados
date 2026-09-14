"use client";

import { useTransition } from "react";
import { setUserActive, setUserRole } from "@/lib/users/actions";
import { Select } from "@/components/ui/input";
import type { UserRole } from "@/lib/types/database";

export function UserRowActions({
  profileId,
  role,
  active,
  isSelf,
}: {
  profileId: string;
  role: UserRole;
  active: boolean;
  isSelf: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <Select
        value={role}
        disabled={isPending || isSelf}
        onChange={(e) => startTransition(() => setUserRole(profileId, e.target.value as UserRole))}
        className="w-28"
      >
        <option value="user">Usuário</option>
        <option value="admin">Admin</option>
      </Select>
      <button
        type="button"
        disabled={isPending || isSelf}
        onClick={() => startTransition(() => setUserActive(profileId, !active))}
        className={`rounded-md px-2.5 py-1 text-xs font-medium ${
          active ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        } ${isSelf ? "cursor-not-allowed opacity-50" : ""}`}
      >
        {active ? "Desativar" : "Ativar"}
      </button>
    </div>
  );
}
