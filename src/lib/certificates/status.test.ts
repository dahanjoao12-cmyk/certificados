import { describe, expect, it } from "vitest";
import { computeCertificateStatus, daysRemaining } from "./status";

function daysFromNow(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

describe("computeCertificateStatus", () => {
  const warningDays = 30;

  it("is EM_DIA when more than the warning threshold remains", () => {
    expect(computeCertificateStatus(daysFromNow(45), false, warningDays)).toBe("EM_DIA");
  });

  it("is VENCENDO with exactly the warning threshold remaining", () => {
    expect(computeCertificateStatus(daysFromNow(30), false, warningDays)).toBe("VENCENDO");
  });

  it("is VENCENDO with 1 day remaining", () => {
    expect(computeCertificateStatus(daysFromNow(1), false, warningDays)).toBe("VENCENDO");
  });

  it("is VENCE_HOJE when it expires today", () => {
    expect(computeCertificateStatus(daysFromNow(0), false, warningDays)).toBe("VENCE_HOJE");
  });

  it("is VENCIDO when the date has passed", () => {
    expect(computeCertificateStatus(daysFromNow(-1), false, warningDays)).toBe("VENCIDO");
    expect(computeCertificateStatus(daysFromNow(-400), false, warningDays)).toBe("VENCIDO");
  });

  it("is ARQUIVADO regardless of date when archived, even if it would otherwise be EM_DIA", () => {
    expect(computeCertificateStatus(daysFromNow(400), true, warningDays)).toBe("ARQUIVADO");
    expect(computeCertificateStatus(daysFromNow(-400), true, warningDays)).toBe("ARQUIVADO");
  });

  it("respects a configurable threshold (section 7: 30/45/60/90 days)", () => {
    expect(computeCertificateStatus(daysFromNow(45), false, 60)).toBe("VENCENDO");
    expect(computeCertificateStatus(daysFromNow(45), false, 30)).toBe("EM_DIA");
  });
});

describe("daysRemaining", () => {
  it("counts down to zero on the due date and negative after", () => {
    expect(daysRemaining(daysFromNow(0))).toBe(0);
    expect(daysRemaining(daysFromNow(5))).toBe(5);
    expect(daysRemaining(daysFromNow(-3))).toBe(-3);
  });
});
