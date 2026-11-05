import * as SQLite from 'expo-sqlite';
import { mergeCapture, type PaymentDraft } from './paymentDrafts';
import { startOfIndiaDay } from './emailWindow';

let database: SQLite.SQLiteDatabase | null = null;
function getDatabase() {
  if (!database) {
    database = SQLite.openDatabaseSync('payment-drafts.db');
    database.execSync('CREATE TABLE IF NOT EXISTS draft_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL)');
    database.execSync('CREATE TABLE IF NOT EXISTS gmail_processed (account_id TEXT NOT NULL, message_id TEXT NOT NULL, PRIMARY KEY(account_id, message_id)); CREATE TABLE IF NOT EXISTS gmail_settings (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL)');
  }
  return database;
}

export type GmailSettings = { enabled: boolean; accountId: string; email: string; lastSyncAt: number; importFrom: number };
export function readGmailSettings(): GmailSettings | null {
  const row = getDatabase().getFirstSync<{ payload: string }>('SELECT payload FROM gmail_settings WHERE id = 1');
  if (!row) return null;
  const settings: GmailSettings = JSON.parse(row.payload);
  if (!Number.isFinite(settings.importFrom)) {
    settings.importFrom = startOfIndiaDay();
    writeGmailSettings(settings);
  }
  return settings;
}
export function writeGmailSettings(settings: GmailSettings) {
  getDatabase().runSync('INSERT OR REPLACE INTO gmail_settings (id, payload) VALUES (1, ?)', JSON.stringify(settings));
}
export function hasProcessedEmail(accountId: string, messageId: string) {
  return Boolean(getDatabase().getFirstSync('SELECT 1 FROM gmail_processed WHERE account_id = ? AND message_id = ?', accountId, messageId));
}
export function storeEmailDraft(accountId: string, messageId: string, draft: PaymentDraft | null): PaymentDraft[] {
  let result: PaymentDraft[] = [];
  getDatabase().withTransactionSync(() => {
    result = readPaymentDrafts();
    if (hasProcessedEmail(accountId, messageId)) return;
    if (draft) { result = mergeCapture(result, draft); writePaymentDrafts(result); }
    // Same transaction as the draft write: a crash cannot mark an unsaved draft processed.
    getDatabase().runSync('INSERT OR IGNORE INTO gmail_processed (account_id, message_id) VALUES (?, ?)', accountId, messageId);
  });
  return result;
}

export function readPaymentDrafts(): PaymentDraft[] {
  const row = getDatabase().getFirstSync<{ payload: string }>('SELECT payload FROM draft_state WHERE id = 1');
  const drafts: PaymentDraft[] = row ? JSON.parse(row.payload) : [];
  const retained = retainDrafts(drafts);
  if (retained.length !== drafts.length) writePaymentDrafts(retained);
  return retained;
}

function retainDrafts(drafts: PaymentDraft[]) {
  // Keep pending drafts; retain completed fingerprints for 30 days to suppress late duplicate alerts.
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return drafts.filter(d => d.status === 'pending' || d.capturedAt >= cutoff);
}

export function writePaymentDrafts(drafts: PaymentDraft[]) {
  getDatabase().runSync('INSERT OR REPLACE INTO draft_state (id, payload) VALUES (1, ?)',
    JSON.stringify(retainDrafts(drafts)));
}
