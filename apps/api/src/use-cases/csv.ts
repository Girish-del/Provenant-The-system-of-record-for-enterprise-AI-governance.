export interface UseCaseCsvRow {
  name: string;
  description?: string;
  purpose?: string;
}

/** Split one CSV line, honoring double-quoted fields and "" escapes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * Parse a CSV of use cases. Requires a header row with a `name` column; optional
 * `description` and `purpose` columns. Blank rows and rows without a name are skipped.
 */
export function parseUseCaseCsv(csv: string): UseCaseCsvRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }
  const header = splitCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf('name');
  if (nameIdx === -1) {
    throw new Error('CSV must include a "name" column');
  }
  const descIdx = header.indexOf('description');
  const purposeIdx = header.indexOf('purpose');

  const rows: UseCaseCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]!);
    const name = (cols[nameIdx] ?? '').trim();
    if (!name) {
      continue;
    }
    rows.push({
      name,
      description: descIdx >= 0 ? (cols[descIdx] ?? '').trim() || undefined : undefined,
      purpose: purposeIdx >= 0 ? (cols[purposeIdx] ?? '').trim() || undefined : undefined,
    });
  }
  return rows;
}
