import "server-only";
import { getResendClient, emailFrom } from "./client";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Thin wrapper around Resend. Never throws -- a failed email must not break
 * the operation that triggered it (user creation, the notification cron
 * run); callers get a boolean back and decide whether to surface it.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await getResendClient().emails.send({
      from: emailFrom(),
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao enviar e-mail." };
  }
}
