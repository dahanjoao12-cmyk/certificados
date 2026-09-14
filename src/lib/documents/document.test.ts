import { describe, expect, it } from "vitest";
import {
  detectDocumentType,
  formatDocument,
  isValidCNPJ,
  isValidCPF,
  normalizeDocument,
  validateDocument,
} from "./document";

describe("normalizeDocument", () => {
  it("strips formatting characters", () => {
    expect(normalizeDocument("68.702.974/0001-50")).toBe("68702974000150");
    expect(normalizeDocument("111.444.777-35")).toBe("11144477735");
  });

  it("handles null/undefined/empty", () => {
    expect(normalizeDocument(null)).toBe("");
    expect(normalizeDocument(undefined)).toBe("");
    expect(normalizeDocument("")).toBe("");
  });
});

describe("detectDocumentType", () => {
  it("detects cpf (11 digits) and cnpj (14 digits)", () => {
    expect(detectDocumentType("11144477735")).toBe("cpf");
    expect(detectDocumentType("68702974000150")).toBe("cnpj");
    expect(detectDocumentType("123")).toBeNull();
  });
});

describe("isValidCNPJ", () => {
  it("accepts a real valid CNPJ, formatted or not", () => {
    expect(isValidCNPJ("68.702.974/0001-50")).toBe(true);
    expect(isValidCNPJ("68702974000150")).toBe(true);
  });

  it("rejects an invalid checksum", () => {
    expect(isValidCNPJ("68702974000151")).toBe(false);
  });

  it("rejects all-same-digit sequences", () => {
    expect(isValidCNPJ("11111111111111")).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidCNPJ("123")).toBe(false);
  });
});

describe("isValidCPF", () => {
  it("accepts a real valid CPF, formatted or not", () => {
    expect(isValidCPF("111.444.777-35")).toBe(true);
    expect(isValidCPF("11144477735")).toBe(true);
  });

  it("rejects an invalid checksum", () => {
    expect(isValidCPF("11144477736")).toBe(false);
  });

  it("rejects all-same-digit sequences", () => {
    expect(isValidCPF("11111111111")).toBe(false);
  });
});

describe("formatDocument", () => {
  it("formats a normalized CNPJ", () => {
    expect(formatDocument("68702974000150")).toBe("68.702.974/0001-50");
  });

  it("formats a normalized CPF", () => {
    expect(formatDocument("11144477735")).toBe("111.444.777-35");
  });

  it("is a no-op for already-formatted or unrecognized-length input", () => {
    expect(formatDocument("abc")).toBe("abc");
  });
});

describe("validateDocument", () => {
  it("recognizes CNPJ regardless of formatting (dedup key requirement)", () => {
    const a = validateDocument("68.702.974/0001-50");
    const b = validateDocument("68702974000150");
    expect(a.valid).toBe(true);
    expect(b.valid).toBe(true);
    expect(a.normalized).toBe(b.normalized);
  });

  it("flags an invalid CNPJ with a friendly error, not an exception", () => {
    const result = validateDocument("11.111.111/1111-11");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/inválido/i);
  });

  it("flags a value with an invalid digit count", () => {
    const result = validateDocument("123");
    expect(result.valid).toBe(false);
    expect(result.type).toBeNull();
  });
});
