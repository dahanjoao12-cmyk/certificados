import { describe, expect, it } from "vitest";
import { computeAlvaraStatus } from "./status";

function daysFromNow(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

describe("computeAlvaraStatus", () => {
  const warningDays = 30;

  it("returns the manual status when not issued, regardless of any date", () => {
    expect(
      computeAlvaraStatus({
        issued: false,
        isPermanent: false,
        manualStatus: "AGUARDANDO",
        validTo: null,
        archived: false,
        warningDays,
      })
    ).toBe("AGUARDANDO");

    expect(
      computeAlvaraStatus({
        issued: false,
        isPermanent: false,
        manualStatus: "CGSIM",
        validTo: null,
        archived: false,
        warningDays,
      })
    ).toBe("CGSIM");
  });

  it("returns DEFINITIVO when issued and permanent, even far in the future or without a date", () => {
    expect(
      computeAlvaraStatus({
        issued: true,
        isPermanent: true,
        manualStatus: "AGUARDANDO",
        validTo: null,
        archived: false,
        warningDays,
      })
    ).toBe("DEFINITIVO");
  });

  it("computes date-driven status when issued with a date, mirroring certificate status", () => {
    const base = { issued: true, isPermanent: false, manualStatus: "AGUARDANDO" as const, archived: false, warningDays };
    expect(computeAlvaraStatus({ ...base, validTo: daysFromNow(45) })).toBe("EM_DIA");
    expect(computeAlvaraStatus({ ...base, validTo: daysFromNow(30) })).toBe("VENCENDO");
    expect(computeAlvaraStatus({ ...base, validTo: daysFromNow(0) })).toBe("VENCE_HOJE");
    expect(computeAlvaraStatus({ ...base, validTo: daysFromNow(-1) })).toBe("VENCIDO");
  });

  it("is ARQUIVADO regardless of everything else when archived", () => {
    expect(
      computeAlvaraStatus({
        issued: true,
        isPermanent: true,
        manualStatus: "AGUARDANDO",
        validTo: null,
        archived: true,
        warningDays,
      })
    ).toBe("ARQUIVADO");

    expect(
      computeAlvaraStatus({
        issued: false,
        isPermanent: false,
        manualStatus: "CGSIM",
        validTo: null,
        archived: true,
        warningDays,
      })
    ).toBe("ARQUIVADO");
  });
});
