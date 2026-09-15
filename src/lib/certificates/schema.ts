import { z } from "zod";

export const certificateSchema = z.object({
  type: z.enum(["e-cnpj", "e-cpf"]),
  model: z.enum(["A1", "A3"]),
  valid_from: z.string().trim().optional().or(z.literal("")),
  valid_to: z.string().trim().min(1, "Informe a data de vencimento"),
  warning_days: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) > 0), {
      message: "Informe um número de dias válido",
    }),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type CertificateFormInput = z.infer<typeof certificateSchema>;

export function normalizeCertificateInput(input: CertificateFormInput) {
  return {
    type: input.type,
    model: input.model,
    valid_from: input.valid_from || null,
    valid_to: input.valid_to,
    warning_days: input.warning_days ? Number(input.warning_days) : null,
    notes: input.notes || null,
  };
}
