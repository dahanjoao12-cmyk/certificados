/**
 * CNPJ/CPF normalization, validation and formatting.
 *
 * Rule used throughout the app: documents are ALWAYS stored and compared as
 * digits-only ("normalized"). Formatting for display happens only at the
 * edges (UI, exports). This is what lets search/import/dedup treat
 * "68.702.974/0001-50" and "68702974000150" as the same document.
 */

export type DocumentType = "cnpj" | "cpf";

/** Strips everything but digits. */
export function normalizeDocument(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

/** Infers cnpj/cpf purely from digit count of the normalized value. */
export function detectDocumentType(normalized: string): DocumentType | null {
  if (normalized.length === 11) return "cpf";
  if (normalized.length === 14) return "cnpj";
  return null;
}

function calculateCpfCheckDigit(digits: number[]): number {
  let sum = 0;
  let weight = digits.length + 1;
  for (const digit of digits) {
    sum += digit * weight;
    weight -= 1;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCPF(value: string): boolean {
  const cpf = normalizeDocument(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // all same digit, e.g. 111.111.111-11

  const digits = cpf.split("").map(Number);
  const base = digits.slice(0, 9);

  const d1 = calculateCpfCheckDigit(base);
  const d2 = calculateCpfCheckDigit([...base, d1]);

  return d1 === digits[9] && d2 === digits[10];
}

function calculateCnpjCheckDigit(digits: number[]): number {
  const weights =
    digits.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * weights[i];
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCNPJ(value: string): boolean {
  const cnpj = normalizeDocument(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const digits = cnpj.split("").map(Number);
  const base = digits.slice(0, 12);

  const d1 = calculateCnpjCheckDigit(base);
  const d2 = calculateCnpjCheckDigit([...base, d1]);

  return d1 === digits[12] && d2 === digits[13];
}

/** Validates a document, auto-detecting CPF (11 digits) vs CNPJ (14 digits). */
export function isValidDocument(value: string): boolean {
  const normalized = normalizeDocument(value);
  const type = detectDocumentType(normalized);
  if (type === "cpf") return isValidCPF(normalized);
  if (type === "cnpj") return isValidCNPJ(normalized);
  return false;
}

/** Formats a normalized (or raw) document for display: 00.000.000/0000-00 or 000.000.000-00. */
export function formatDocument(value: string | null | undefined): string {
  const normalized = normalizeDocument(value);
  if (normalized.length === 14) {
    return normalized.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );
  }
  if (normalized.length === 11) {
    return normalized.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return value ?? "";
}

export interface DocumentValidationResult {
  normalized: string;
  type: DocumentType | null;
  valid: boolean;
  error?: string;
}

/** Single entry point used by forms and the importer to validate user input. */
export function validateDocument(value: string): DocumentValidationResult {
  const normalized = normalizeDocument(value);
  const type = detectDocumentType(normalized);

  if (!type) {
    return {
      normalized,
      type: null,
      valid: false,
      error: "CNPJ/CPF deve ter 11 (CPF) ou 14 (CNPJ) dígitos",
    };
  }

  const valid = type === "cpf" ? isValidCPF(normalized) : isValidCNPJ(normalized);

  return {
    normalized,
    type,
    valid,
    error: valid ? undefined : `${type.toUpperCase()} inválido`,
  };
}
