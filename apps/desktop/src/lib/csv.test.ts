import { describe, expect, it } from "vitest";
import { csvField, toCsv } from "./csv";

describe("csv", () => {
  it("quotes fields that need it and neutralises formulas", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField('a "b", c')).toBe('"a ""b"", c"');
    expect(csvField("line\nbreak")).toBe('"line\nbreak"');
    expect(csvField("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvField(null)).toBe("");
    expect(csvField(0.5)).toBe("0.5");
  });

  it("joins rows with CRLF", () => {
    expect(toCsv(["a", "b"], [[1, "x,y"]])).toBe('a,b\r\n1,"x,y"');
  });
});
