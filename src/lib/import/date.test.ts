import { describe, expect, it } from "vitest";
import { parseFlexibleDate } from "./date";

describe("parseFlexibleDate", () => {
  it("parses dd/mm/yyyy (spreadsheet convention)", () => {
    expect(parseFlexibleDate("10/09/2027")).toBe("2027-09-10");
  });

  it("parses dd-mm-yyyy", () => {
    expect(parseFlexibleDate("10-09-2027")).toBe("2027-09-10");
  });

  it("parses yyyy-mm-dd (ISO)", () => {
    expect(parseFlexibleDate("2027-09-10")).toBe("2027-09-10");
  });

  it("pads single-digit day/month", () => {
    expect(parseFlexibleDate("1/9/2027")).toBe("2027-09-01");
  });

  it("rejects an impossible calendar date", () => {
    expect(parseFlexibleDate("31/02/2027")).toBeNull();
  });

  it("rejects garbage input rather than throwing", () => {
    expect(parseFlexibleDate("not a date")).toBeNull();
    expect(parseFlexibleDate("")).toBeNull();
  });
});
