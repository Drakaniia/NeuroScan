/** RFC 4180 CSV: quote a field when it contains a comma, quote or line break. */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // A leading = + - @ would be evaluated as a formula by spreadsheet software.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows]
    .map((row) => row.map(csvField).join(","))
    .join("\r\n");
}
