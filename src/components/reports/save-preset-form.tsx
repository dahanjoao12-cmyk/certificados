"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveReportPreset } from "@/lib/reports/presets";
import type { ReportBase } from "@/lib/reports/engine";

const IGNORED_PARAMS = new Set(["base", "cols", "sort", "dir", "page", "pageSize", "presetId"]);

export function SavePresetForm({ base, columns }: { base: ReportBase; columns: string[] }) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const filters: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (!IGNORED_PARAMS.has(key) && value) filters[key] = value;
    }
    const result = await saveReportPreset({
      name,
      base,
      filters,
      columns,
      sort: searchParams.get("sort") ?? undefined,
      dir: (searchParams.get("dir") as "asc" | "desc") ?? undefined,
    });
    setSaving(false);
    if (result.error) {
      setMessage(result.error);
    } else {
      setMessage("Relatório salvo.");
      setName("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Save size={14} /> Salvar relatório
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do relatório"
        className="w-56"
      />
      <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
        {saving ? "Salvando..." : "Salvar"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancelar
      </Button>
      {message && <span className="text-xs text-slate-500">{message}</span>}
    </div>
  );
}
