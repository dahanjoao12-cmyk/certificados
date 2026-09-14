/** Parses dd/mm/yyyy, yyyy-mm-dd or dd-mm-yyyy into an ISO date (yyyy-mm-dd). Returns null if unparseable. */
export function parseFlexibleDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return isValidDate(+y, +m, +d) ? `${y}-${m}-${d}` : null;
  }

  const brMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    const day = d.padStart(2, "0");
    const month = m.padStart(2, "0");
    return isValidDate(+y, +month, +day) ? `${y}-${month}-${day}` : null;
  }

  return null;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
