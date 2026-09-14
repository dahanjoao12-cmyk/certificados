import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { insertCertificateForCompany } from "@/lib/certificates/create";
import { detectDocumentType } from "@/lib/documents/document";
import type { PfxMetadata } from "@/lib/pfx/parse";

interface ConfirmBody {
  companyId: string;
  metadata: PfxMetadata;
  model: "A1" | "A3";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body: ConfirmBody = await request.json();
  if (!body.companyId || !body.metadata) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, document_type")
    .eq("id", body.companyId)
    .maybeSingle();

  if (!company) {
    return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  const documentType = company.document_type ?? detectDocumentType(body.metadata.extractedDocument ?? "") ?? "cnpj";

  try {
    const { certificateId, isRenewal } = await insertCertificateForCompany(supabase, {
      companyId: body.companyId,
      userId: user.id,
      origin: "pfx",
      processedAt: new Date().toISOString(),
      fields: {
        type: documentType === "cpf" ? "e-cpf" : "e-cnpj",
        model: body.model === "A3" ? "A3" : "A1",
        subject: body.metadata.subject,
        issuer: body.metadata.issuer,
        serial_number: body.metadata.serialNumber,
        valid_from: body.metadata.validFrom,
        valid_to: body.metadata.validTo,
        fingerprint: body.metadata.fingerprintSha1,
        algorithm: body.metadata.signatureAlgorithm,
        metadata: {
          fingerprint_sha256: body.metadata.fingerprintSha256,
          public_key_algorithm: body.metadata.publicKeyAlgorithm,
          public_key_bits: body.metadata.publicKeyBits,
          common_name: body.metadata.commonName,
        },
      },
    });

    return NextResponse.json({ certificateId, isRenewal });
  } catch {
    return NextResponse.json({ error: "Falha ao salvar o certificado." }, { status: 500 });
  }
}
