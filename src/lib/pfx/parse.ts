import "server-only";
import forge from "node-forge";

export class PfxParseError extends Error {
  constructor(
    message: string,
    public readonly reason: "wrong_password" | "invalid_file"
  ) {
    super(message);
  }
}

export interface PfxMetadata {
  subject: string;
  issuer: string;
  commonName: string | null;
  serialNumber: string;
  validFrom: string; // ISO date
  validTo: string; // ISO date
  fingerprintSha1: string;
  fingerprintSha256: string;
  signatureAlgorithm: string | null;
  publicKeyAlgorithm: string | null;
  publicKeyBits: number | null;
  /**
   * Best-effort CNPJ/CPF found in the certificate's Common Name, following
   * the common ICP-Brasil convention "RAZAO SOCIAL:CNPJ" / "NOME:CPF".
   * This is a heuristic over a standard, always-present field (CN) -- NOT a
   * decode of the ICP-Brasil-specific subjectAltName otherName extension
   * (CPF/CNPJ/responsible/birth-date OIDs per DOC-ICP-05), which this
   * project does not implement. When the CN doesn't follow that pattern,
   * this is null and the company must be picked manually.
   */
  extractedDocument: string | null;
  extractedDocumentType: "cnpj" | "cpf" | null;
}

const SIGNATURE_ALGORITHM_NAMES: Record<string, string> = {
  "1.2.840.113549.1.1.5": "sha1WithRSAEncryption",
  "1.2.840.113549.1.1.11": "sha256WithRSAEncryption",
  "1.2.840.113549.1.1.12": "sha384WithRSAEncryption",
  "1.2.840.113549.1.1.13": "sha512WithRSAEncryption",
  "1.2.840.10045.4.3.2": "ecdsa-with-SHA256",
  "1.2.840.10045.4.3.3": "ecdsa-with-SHA384",
};

function findAttributeValue(attributes: forge.pki.CertificateField[], shortName: string): string | null {
  const attr = attributes.find((a) => a.shortName === shortName);
  return (attr?.value as string | undefined) ?? null;
}

function formatDN(attributes: forge.pki.CertificateField[]): string {
  return attributes
    .map((a) => `${a.shortName ?? a.name}=${a.value}`)
    .join(", ");
}

function extractDocumentFromCommonName(cn: string | null): { document: string | null; type: "cnpj" | "cpf" | null } {
  if (!cn) return { document: null, type: null };
  const match = cn.match(/:(\d{11,14})$/);
  if (!match) return { document: null, type: null };
  const digits = match[1];
  if (digits.length === 14) return { document: digits, type: "cnpj" };
  if (digits.length === 11) return { document: digits, type: "cpf" };
  return { document: null, type: null };
}

/**
 * Parses a PKCS#12 (.pfx/.p12) file server-side and extracts standard X.509
 * certificate metadata. The private key is never extracted or persisted --
 * we only read the certificate bag. Caller is responsible for discarding
 * `buffer` and `password` immediately after calling this (never log them).
 */
export function parsePfx(buffer: Buffer, password: string): PfxMetadata {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const der = forge.util.createBuffer(buffer.toString("binary"));
    const asn1 = forge.asn1.fromDer(der);
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/invalid password|mac/i.test(message)) {
      throw new PfxParseError("Senha incorreta para este certificado.", "wrong_password");
    }
    throw new PfxParseError("Arquivo .pfx/.p12 inválido ou corrompido.", "invalid_file");
  }

  const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = bags[forge.pki.oids.certBag]?.[0];
  const cert = certBag?.cert;
  if (!cert) {
    throw new PfxParseError("Nenhum certificado encontrado dentro do arquivo.", "invalid_file");
  }

  const derBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const fingerprintSha1 = forge.md.sha1.create().update(derBytes).digest().toHex();
  const fingerprintSha256 = forge.md.sha256.create().update(derBytes).digest().toHex();

  const commonName = findAttributeValue(cert.subject.attributes, "CN");
  const { document, type } = extractDocumentFromCommonName(commonName);

  const signatureOid = (cert as unknown as { siginfo?: { algorithmOid?: string } }).siginfo?.algorithmOid ?? null;
  const publicKey = cert.publicKey as forge.pki.rsa.PublicKey | undefined;

  return {
    subject: formatDN(cert.subject.attributes),
    issuer: formatDN(cert.issuer.attributes),
    commonName,
    serialNumber: cert.serialNumber,
    validFrom: cert.validity.notBefore.toISOString().slice(0, 10),
    validTo: cert.validity.notAfter.toISOString().slice(0, 10),
    fingerprintSha1,
    fingerprintSha256,
    signatureAlgorithm: signatureOid ? SIGNATURE_ALGORITHM_NAMES[signatureOid] ?? signatureOid : null,
    publicKeyAlgorithm: publicKey?.n ? "RSA" : null,
    publicKeyBits: publicKey?.n ? publicKey.n.bitLength() : null,
    extractedDocument: document,
    extractedDocumentType: type,
  };
}
