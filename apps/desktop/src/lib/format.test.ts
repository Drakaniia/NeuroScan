import { describe, expect, it } from "vitest";
import {
  ageInYears,
  auditActionLabel,
  formatBytes,
  formatPercent,
  patientName,
  sexAge,
} from "./format";

describe("clinical formatting", () => {
  it("computes whole-year age around the birthday", () => {
    const at = new Date(2026, 10, 6); // 6 Nov 2026
    expect(ageInYears("1984-11-06", at)).toBe(42);
    expect(ageInYears("1984-11-07", at)).toBe(41);
    expect(ageInYears(null, at)).toBeNull();
    expect(ageInYears("2030-01-01", at)).toBeNull();
  });

  it("formats names, sex/age and percentages consistently", () => {
    expect(patientName({ givenName: "Maria", familyName: "Santos" })).toBe(
      "SANTOS, Maria",
    );
    expect(sexAge({ sex: "female", birthDate: null })).toBe("F");
    expect(formatPercent(0.4567)).toBe("45.7%");
    expect(formatPercent(null)).toBe("—");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("labels audit actions and falls back for unknown ones", () => {
    expect(auditActionLabel("report_signed")).toBe("Report signed");
    expect(auditActionLabel("something_new")).toBe("something new");
  });
});
