function baseLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#0f172a;padding:16px 24px;">
              <span style="color:#ffffff;font-size:15px;font-weight:600;">Certificados Digitais</span>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <h1 style="margin:0 0 16px;font-size:17px;color:#0f172a;">${title}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #e2e8f0;">
              <span style="font-size:11px;color:#94a3b8;">Sistema interno de controle de certificados digitais. Não responda este e-mail.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function inviteEmailHtml(params: { fullName: string; inviteLink: string }): string {
  return baseLayout(
    "Você foi convidado",
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Olá, ${escapeHtml(params.fullName)}. Você foi convidado a acessar o sistema de controle de certificados digitais do escritório.</p>
     <p style="margin:0 0 24px;font-size:14px;line-height:1.6;">Clique no botão abaixo para definir sua senha e entrar:</p>
     <p style="margin:0 0 24px;">
       <a href="${params.inviteLink}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;">Definir senha e entrar</a>
     </p>
     <p style="margin:0;font-size:12px;color:#64748b;">Se você não esperava este e-mail, pode ignorá-lo.</p>`
  );
}

export function certificateDigestEmailHtml(params: {
  fullName: string;
  rows: { companyName: string; companyCode: string; validTo: string; statusLabel: string }[];
  appUrl: string;
}): string {
  const rowsHtml = params.rows
    .map(
      (r) => `<tr>
        <td style="padding:8px 6px;border-bottom:1px solid #f1f5f9;font-size:13px;">${escapeHtml(r.companyName)} <span style="color:#94a3b8;">(${escapeHtml(r.companyCode)})</span></td>
        <td style="padding:8px 6px;border-bottom:1px solid #f1f5f9;font-size:13px;white-space:nowrap;">${escapeHtml(r.validTo)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #f1f5f9;font-size:13px;white-space:nowrap;">${escapeHtml(r.statusLabel)}</td>
      </tr>`
    )
    .join("");

  return baseLayout(
    `${params.rows.length} certificado(s) precisam de atenção`,
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Olá, ${escapeHtml(params.fullName)}. Estes certificados estão vencendo, vencem hoje ou já venceram:</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
       <thead>
         <tr>
           <th align="left" style="font-size:11px;text-transform:uppercase;color:#94a3b8;padding:0 6px 6px;">Empresa</th>
           <th align="left" style="font-size:11px;text-transform:uppercase;color:#94a3b8;padding:0 6px 6px;">Vencimento</th>
           <th align="left" style="font-size:11px;text-transform:uppercase;color:#94a3b8;padding:0 6px 6px;">Status</th>
         </tr>
       </thead>
       <tbody>${rowsHtml}</tbody>
     </table>
     <p style="margin:0;">
       <a href="${params.appUrl}/notificacoes" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;">Ver no sistema</a>
     </p>`
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
