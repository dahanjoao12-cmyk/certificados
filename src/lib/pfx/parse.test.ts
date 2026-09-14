import { describe, expect, it } from "vitest";
import forge from "node-forge";
import { parsePfx, PfxParseError } from "./parse";

/** Builds a real, self-signed PKCS#12 in memory -- no external tools/fixtures needed. */
function buildTestPfx(commonName: string, password: string): Buffer {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date("2026-01-01T00:00:00Z");
  cert.validity.notAfter = new Date("2027-01-01T00:00:00Z");

  const attrs = [
    { name: "commonName", value: commonName },
    { name: "organizationName", value: "Empresa Teste" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    algorithm: "3des",
  });
  const der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(der, "binary");
}

describe("parsePfx", () => {
  it("extracts standard certificate metadata with the correct password", () => {
    const buffer = buildTestPfx("EMPRESA TESTE LTDA:12345678000199", "senha-correta");
    const metadata = parsePfx(buffer, "senha-correta");

    expect(metadata.subject).toContain("EMPRESA TESTE LTDA:12345678000199");
    expect(metadata.validFrom).toBe("2026-01-01");
    expect(metadata.validTo).toBe("2027-01-01");
    expect(metadata.fingerprintSha1).toMatch(/^[0-9a-f]{40}$/);
    expect(metadata.fingerprintSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("extracts CNPJ from the CN when it follows the NOME:CNPJ convention", () => {
    const buffer = buildTestPfx("EMPRESA TESTE LTDA:12345678000199", "x");
    const metadata = parsePfx(buffer, "x");
    expect(metadata.extractedDocument).toBe("12345678000199");
    expect(metadata.extractedDocumentType).toBe("cnpj");
  });

  it("extracts CPF from the CN when it follows the NOME:CPF convention", () => {
    const buffer = buildTestPfx("FULANO DE TAL:11144477735", "x");
    const metadata = parsePfx(buffer, "x");
    expect(metadata.extractedDocument).toBe("11144477735");
    expect(metadata.extractedDocumentType).toBe("cpf");
  });

  it("leaves extractedDocument null when the CN doesn't follow the convention -- never fabricates one", () => {
    const buffer = buildTestPfx("Certificado Sem Padrao Reconhecido", "x");
    const metadata = parsePfx(buffer, "x");
    expect(metadata.extractedDocument).toBeNull();
    expect(metadata.extractedDocumentType).toBeNull();
  });

  it("throws a wrong_password PfxParseError for an incorrect password", () => {
    const buffer = buildTestPfx("EMPRESA TESTE LTDA:12345678000199", "senha-correta");
    try {
      parsePfx(buffer, "senha-errada");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PfxParseError);
      expect((err as PfxParseError).reason).toBe("wrong_password");
    }
  });

  it("throws an invalid_file PfxParseError for a file that isn't a PKCS#12 at all", () => {
    const buffer = Buffer.from("this is definitely not a pfx file");
    try {
      parsePfx(buffer, "whatever");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PfxParseError);
      expect((err as PfxParseError).reason).toBe("invalid_file");
    }
  });
});
