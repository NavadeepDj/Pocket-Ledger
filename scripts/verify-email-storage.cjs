// Exercise the production storage functions against real SQLite, with an Expo API adapter.
const { DatabaseSync } = require('node:sqlite');
const Module = require('module');
const db = new DatabaseSync(':memory:');
let failProcessedWrite = false;
const adapter = {
  execSync: sql => db.exec(sql),
  getFirstSync: (sql, ...params) => db.prepare(sql).get(...params) ?? null,
  runSync: (sql, ...params) => {
    if (failProcessedWrite && sql.startsWith('INSERT OR IGNORE INTO gmail_processed')) throw new Error('simulated storage failure');
    return db.prepare(sql).run(...params);
  },
  withTransactionSync: fn => {
    db.exec('BEGIN');
    try { fn(); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; }
  },
};
const originalLoad = Module._load;
Module._load = function (name, ...args) {
  if (name === 'expo-sqlite') return { openDatabaseSync: () => adapter };
  return originalLoad.call(this, name, ...args);
};
let storage;
try { storage = require('../services/paymentDraftStorage.ts'); }
finally { Module._load = originalLoad; }
const assert = require('node:assert/strict');
const { parseBankEmail } = require('../services/emailParser.ts');
const draft = parseBankEmail({ id: 'durable', internalDate: String(Date.now()), payload: {
  mimeType: 'text/plain', headers: [{ name: 'From', value: 'noreply@slice.bank.in' }],
  body: { data: Buffer.from('₹1 debited from your slice account xx1234 via UPI.\nTransaction date: 05-Nov-26\nTo: TEST FRIEND\nRRN: 123456789012').toString('base64url') },
} }, 'test-account').draft;
assert.ok(draft);
failProcessedWrite = true;
assert.throws(() => storage.storeEmailDraft('test-account', 'durable', draft));
assert.equal(storage.readPaymentDrafts().length, 0, 'Draft write must roll back with failed processed marker');
assert.equal(storage.hasProcessedEmail('test-account', 'durable'), false);
failProcessedWrite = false;
storage.storeEmailDraft('test-account', 'durable', draft);
storage.storeEmailDraft('test-account', 'durable', draft);
assert.equal(storage.readPaymentDrafts().length, 1);
assert.equal(storage.hasProcessedEmail('test-account', 'durable'), true);
assert.equal(storage.hasProcessedEmail('other-account', 'durable'), false);
storage.writeGmailSettings({ accountId: 'test-account', email: 'test@example.invalid', enabled: true, lastSyncAt: 123 });
assert.equal(storage.readGmailSettings().lastSyncAt, 123);
assert.equal(storage.readGmailSettings().enabled, true);
db.close();
console.log('Email SQLite tests passed: atomic rollback, durable deduplication, account isolation and sync settings.');
