import "server-only";
import { Resend } from "resend";

export const emailFrom = () => process.env.EMAIL_FROM || "Certificados Digitais <onboarding@resend.dev>";

let client: Resend | null = null;

/** Lazily-constructed Resend client -- avoids throwing at import time in code paths that never actually send an email. */
export function getResendClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("Variável de ambiente RESEND_API_KEY não configurada. Veja .env.example.");
    client = new Resend(apiKey);
  }
  return client;
}
