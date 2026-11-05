const INDIA_OFFSET = 330 * 60 * 1000;
export function startOfIndiaDay(now = Date.now()): number {
  const date = new Date(now + INDIA_OFFSET);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - INDIA_OFFSET;
}
export function emailSyncStart(importFrom: number, lastSyncAt: number, rescan: boolean): number {
  return Math.max(importFrom, lastSyncAt && !rescan ? lastSyncAt - 2 * 86400000 : importFrom);
}
export function indiaDateLabel(timestamp: number): string {
  return new Date(timestamp + INDIA_OFFSET).toISOString().slice(0, 10);
}
export function parseImportDate(value: string, now = Date.now()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00+05:30`);
  if (!Number.isFinite(timestamp) || indiaDateLabel(timestamp) !== value || timestamp > startOfIndiaDay(now) || timestamp < Date.parse('2000-01-01T00:00:00+05:30')) return null;
  return timestamp;
}
