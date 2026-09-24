import { z } from "zod";
import { normalizeDocument, validateDocument } from "@/lib/documents/document";

export const companySchema = z.object({
  code: z.string().trim().min(1, "Informe o código da empresa"),
  document: z
    .string()
    .trim()
    .min(1, "Informe o CNPJ ou CPF")
    .superRefine((value, ctx) => {
      const result = validateDocument(value);
      if (!result.valid) {
        ctx.addIssue({ code: "custom", message: result.error ?? "CNPJ/CPF inválido" });
      }
    }),
  corporate_name: z.string().trim().min(1, "Informe a razão social"),
  trade_name: z.string().trim().optional().or(z.literal("")),
  short_name: z.string().trim().optional().or(z.literal("")),
  municipality: z.string().trim().optional().or(z.literal("")),
  uf: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || v.length === 2, "UF deve ter 2 letras"),
  situation: z.string().trim().optional().or(z.literal("")),
  responsible_user_id: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  whatsapp: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || z.string().email().safeParse(v).success, "E-mail inválido"),
  state_registration: z.string().trim().optional().or(z.literal("")),
  municipal_tax_registration: z.string().trim().optional().or(z.literal("")),
  zip_code: z.string().trim().optional().or(z.literal("")),
  address_street: z.string().trim().optional().or(z.literal("")),
  address_number: z.string().trim().optional().or(z.literal("")),
  address_complement: z.string().trim().optional().or(z.literal("")),
  neighborhood: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export type CompanyFormInput = z.infer<typeof companySchema>;

export function normalizeCompanyInput(input: CompanyFormInput) {
  return {
    ...input,
    document: normalizeDocument(input.document),
    uf: input.uf ? input.uf.toUpperCase() : null,
    trade_name: input.trade_name || null,
    short_name: input.short_name || null,
    municipality: input.municipality || null,
    situation: input.situation || null,
    responsible_user_id: input.responsible_user_id || null,
    phone: input.phone || null,
    whatsapp: input.whatsapp || null,
    email: input.email || null,
    state_registration: input.state_registration || null,
    municipal_tax_registration: input.municipal_tax_registration || null,
    zip_code: input.zip_code || null,
    address_street: input.address_street || null,
    address_number: input.address_number || null,
    address_complement: input.address_complement || null,
    neighborhood: input.neighborhood || null,
    notes: input.notes || null,
  };
}
