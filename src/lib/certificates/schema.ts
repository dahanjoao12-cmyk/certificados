import { z } from "zod";

export const certificateSchema = z.object({
  type: z.enum(["e-cnpj", "e-cpf"]),
  model: z.enum(["A1", "A3"]),
  serial_number: z.string().trim().optional().or(z.literal("")),
  subject: z.string().trim().optional().or(z.literal("")),
  issuer: z.string().trim().optional().or(z.literal("")),
  certificate_authority: z.string().trim().optional().or(z.literal("")),
  valid_from: z.string().trim().optional().or(z.literal("")),
  valid_to: z.string().trim().min(1, "Informe a data de vencimento"),
  fingerprint: z.string().trim().optional().or(z.literal("")),
  algorithm: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type CertificateFormInput = z.infer<typeof certificateSchema>;

export function normalizeCertificateInput(input: CertificateFormInput) {
  return {
    type: input.type,
    model: input.model,
    serial_number: input.serial_number || null,
    subject: input.subject || null,
    issuer: input.issuer || null,
    certificate_authority: input.certificate_authority || null,
    valid_from: input.valid_from || null,
    valid_to: input.valid_to,
    fingerprint: input.fingerprint || null,
    algorithm: input.algorithm || null,
    notes: input.notes || null,
  };
}
