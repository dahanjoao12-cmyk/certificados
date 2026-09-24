import { z } from "zod";

/**
 * `status_mode` drives which of manual_status/valid_to the form actually
 * shows and submits -- mirrors the DB's `alvaras_status_consistency` check
 * constraint (supabase/migrations/0012_alvaras.sql) so a bad combination is
 * caught here with a friendly message instead of a raw Postgres error.
 */
export const alvaraSchema = z
  .object({
    type_id: z.string().trim().min(1, "Selecione o tipo de alvará"),
    status_mode: z.enum(["pendente", "definitivo", "com_data"]),
    manual_status: z.enum(["AGUARDANDO", "CGSIM"]).optional().or(z.literal("")),
    valid_to: z.string().trim().optional().or(z.literal("")),
    prioritario: z.boolean(),
    municipality: z.string().trim().optional().or(z.literal("")),
    uf: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((value) => !value || value.length === 2, { message: "Use a sigla com 2 letras" }),
    notes: z.string().trim().optional().or(z.literal("")),
    condicionantes_total: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0), {
        message: "Informe um número válido",
      }),
    condicionantes_atendidas: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0), {
        message: "Informe um número válido",
      }),
  })
  .superRefine((data, ctx) => {
    if (data.status_mode === "com_data" && !data.valid_to) {
      ctx.addIssue({ code: "custom", path: ["valid_to"], message: "Informe a data de vencimento" });
    }
    const total = Number(data.condicionantes_total || 0);
    const atendidas = Number(data.condicionantes_atendidas || 0);
    if (atendidas > total) {
      ctx.addIssue({
        code: "custom",
        path: ["condicionantes_atendidas"],
        message: "Não pode ser maior que o total",
      });
    }
  });

export type AlvaraFormInput = z.infer<typeof alvaraSchema>;

export function normalizeAlvaraInput(input: AlvaraFormInput) {
  const issued = input.status_mode !== "pendente";
  const isPermanent = input.status_mode === "definitivo";

  return {
    type_id: input.type_id,
    manual_status: input.status_mode === "pendente" ? (input.manual_status || "AGUARDANDO") : "AGUARDANDO",
    issued,
    is_permanent: isPermanent,
    valid_to: input.status_mode === "com_data" ? input.valid_to || null : null,
    prioritario: input.prioritario,
    municipality: input.municipality || null,
    uf: input.uf ? input.uf.toUpperCase() : null,
    notes: input.notes || null,
    condicionantes_total: input.condicionantes_total ? Number(input.condicionantes_total) : 0,
    condicionantes_atendidas: input.condicionantes_atendidas ? Number(input.condicionantes_atendidas) : 0,
  };
}
