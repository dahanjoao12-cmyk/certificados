import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AlvaraForm } from "@/components/alvaras/alvara-form";
import { AttachmentSection } from "@/components/alvaras/attachment-section";
import { updateAlvara } from "@/lib/alvaras/actions";
import { listAlvaraTypes, resolveEffectiveAttachment } from "@/lib/alvaras/queries";
import type { Alvara } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function EditAlvaraPage({
  params,
}: {
  params: Promise<{ id: string; alvaraId: string }>;
}) {
  const { id, alvaraId } = await params;
  const supabase = await createClient();

  const [{ data: company }, { data: alvara }, types] = await Promise.all([
    supabase.from("companies").select("id, corporate_name").eq("id", id).maybeSingle(),
    supabase.from("alvaras").select("*").eq("id", alvaraId).maybeSingle(),
    listAlvaraTypes(supabase),
  ]);

  if (!company || !alvara) notFound();

  const type = types.find((t) => t.id === (alvara as Alvara).type_id);
  const effectiveAttachment = await resolveEffectiveAttachment(
    supabase,
    alvara as Alvara,
    type?.shared_attachment_by_municipality ?? false
  );

  const boundAction = updateAlvara.bind(null, alvaraId, id);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Editar alvará</h1>
        <p className="text-sm text-slate-500">{company.corporate_name}</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-6">
        <AlvaraForm action={boundAction} alvara={alvara as Alvara} types={types} companyId={id} />
      </div>
      <AttachmentSection
        alvaraId={alvaraId}
        companyId={id}
        attachmentName={effectiveAttachment?.name ?? null}
        attachmentSize={effectiveAttachment?.size ?? null}
        sharedFromMunicipality={effectiveAttachment?.shared ?? false}
      />
    </div>
  );
}
