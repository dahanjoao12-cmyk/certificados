import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { listNotifications } from "@/lib/notifications/queries";
import { testAdminClient, cleanupTestData, TEST_DOCUMENT, testCode } from "@/test/integration/helpers";

describe("listNotifications (integration)", () => {
  let alertingCertificateId: string;
  let okCertificateId: string;

  beforeAll(async () => {
    const supabase = testAdminClient();
    const { data: company } = await supabase
      .from("companies")
      .insert({
        code: testCode("notif"),
        document: TEST_DOCUMENT,
        document_type: "cnpj",
        corporate_name: "Empresa Notificação LTDA",
        active: true,
        origin: "manual",
      })
      .select("id")
      .single();

    const inFiveDays = new Date();
    inFiveDays.setDate(inFiveDays.getDate() + 5);
    const inOneYear = new Date();
    inOneYear.setFullYear(inOneYear.getFullYear() + 1);

    const { data: alerting } = await supabase
      .from("certificates")
      .insert({
        company_id: company!.id,
        type: "e-cnpj",
        model: "A1",
        valid_to: inFiveDays.toISOString().slice(0, 10),
        warning_days: 30,
        is_current: false,
        origin: "manual",
      })
      .select("id")
      .single();
    alertingCertificateId = alerting!.id;

    const { data: ok } = await supabase
      .from("certificates")
      .insert({
        company_id: company!.id,
        type: "e-cnpj",
        model: "A1",
        valid_to: inOneYear.toISOString().slice(0, 10),
        is_current: false,
        origin: "manual",
      })
      .select("id")
      .single();
    okCertificateId = ok!.id;
  });

  afterAll(cleanupTestData);

  it("lists only the alerting certificate, unread until marked", async () => {
    const supabase = testAdminClient();
    const fakeUserId = "00000000-0000-0000-0000-000000000000"; // no matching notification_reads rows -> everything unread

    const items = await listNotifications(supabase, fakeUserId);
    const ids = items.map((i) => i.certificate.id);

    expect(ids).toContain(alertingCertificateId);
    expect(ids).not.toContain(okCertificateId);

    const alertingItem = items.find((i) => i.certificate.id === alertingCertificateId);
    expect(alertingItem?.isRead).toBe(false);
    expect(alertingItem?.certificate.status).toBe("VENCENDO");
  });
});
