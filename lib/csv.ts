/*
 * CSV for spreadsheets. Fields are quoted when needed, and any cell that a
 * spreadsheet would run as a formula (= + - @ at the start) is prefixed with an
 * apostrophe: a customer name like "=HYPERLINK(...)" must stay text.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let text = typeof value === 'number' ? String(value) : String(value)
  if (typeof value !== 'number' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header: string[], rows: unknown[][]): string {
  // A byte-order mark so Excel opens it as UTF-8 (names with accents, the ’ in text).
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename.replace(/[^\w.-]/g, '_')}"`,
      'cache-control': 'no-store',
    },
  })
}
