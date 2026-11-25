import { describe, expect, it } from "vitest";
import { passwordChecks } from "./PasswordRules";

// Mirrors `auth::tests::password_policy` in the backend.
describe("password checklist", () => {
  const ok = (username: string, password: string) =>
    passwordChecks(username, password).every((rule) => rule.ok);

  it("matches the backend policy", () => {
    expect(ok("dr.ada", "short1")).toBe(false);
    expect(ok("dr.ada", "onlyletterswithoutdigits")).toBe(false);
    expect(ok("dr.ada", "1234567890123")).toBe(false);
    expect(ok("dr.ada", "dr.ada-2026-pass")).toBe(false);
    expect(ok("dr.ada", "MRI-review-2026")).toBe(true);
  });
});
