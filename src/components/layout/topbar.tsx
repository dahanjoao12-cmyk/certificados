import { LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { GlobalSearch } from "./global-search";

export function Topbar({ userName }: { userName: string }) {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4">
      <div className="w-full max-w-md">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">{userName}</span>
        <form action={signOut}>
          <button
            type="submit"
            title="Sair"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}
