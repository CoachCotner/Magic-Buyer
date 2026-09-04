// CSV is the storage layer. No database — every list is a file in /lists, which
// means Lauren can open any of it in Excel, hand it to a skip-trace service, or
// mail-merge it without going through this app at all.

import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function readCsv(path) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, 'utf8');
  if (!text.trim()) return [];
  return parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true });
}

export function writeCsv(path, rows, header) {
  mkdirSync(dirname(path), { recursive: true });
  const columns = header ?? (rows.length ? Object.keys(rows[0]) : []);
  writeFileSync(path, stringify(rows, { header: true, columns }));
  return rows.length;
}

export const listFiles = (dir, ext = '.csv') =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(ext)) : [];

/** Slug safe for a filename, so a buyer nickname can name its own list file. */
export const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'untitled';

export const listPath = (root, name) => join(root, `${slug(name)}.csv`);
