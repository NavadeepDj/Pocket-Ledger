import { parseBankEmail, parseIndianEmailDate, type GmailMessage } from '../emailParser';
import { mergeCapture } from '../paymentDrafts';
import { syncBankEmails, type GmailRequest } from '../gmailSync';
import { startOfIndiaDay, indiaDateLabel, parseImportDate, emailSyncStart } from '../emailWindow';

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
// Same structures as the supplied emails, with synthetic names, suffixes and references.
const sliceBody = '<p>Hi Test Customer,</p><p>₹1 debited from your slice account xx1234 via UPI.</p><table><tr><td>Transaction date</td><td>05-Nov-26</td></tr><tr><td>To</td><td>TEST FRIEND</td></tr><tr><td>RRN</td><td>123456789012</td></tr></table><p>Best,<br>Team slice</p><img src="https://example.invalid/tracker">';
const hdfcBody = '<p>Dear <strong>Customer</strong>,</p><p>Recent UPI transaction using your RuPay Credit Card.</p><p><strong>Rs.424.47</strong> has been <strong>debited</strong> from your <strong>RuPay Credit Card (ending 4321)</strong><br>Paid to <strong>**********************payu@mairtel</strong><br>Date: <strong>18-10-26</strong><br><strong>UPI Transaction Reference Number: 987654321012</strong></p><p>Important Note:<br>If you did not make this transaction, call 1800 258 6161.<br>Cards &gt; Request &gt; Credit Card Hotlisting<br>Send BLOCK CC 4321 to 730808080</p>';
function mail(id: string, from: string, body: string, mimeType = 'text/html'): GmailMessage {
  return { id, internalDate: String(Date.parse('2026-11-05T10:00:00Z')), payload: {
    mimeType, headers: [{ name: 'From', value: from }, { name: 'Subject', value: 'Transaction alert' }],
    body: { data: Buffer.from(body, 'utf8').toString('base64url') },
  } };
}
const sliceMail = mail('slice1', 'slice <noreply@slice.bank.in>', sliceBody);
const hdfcMail = mail('hdfc1', 'HDFC Bank InstaAlerts <alerts@hdfcbank.bank.in>', hdfcBody);
const slice = parseBankEmail(sliceMail, 'account-a').draft;
const today = startOfIndiaDay(Date.parse('2026-11-05T11:00:00Z'));
assert(today === Date.parse('2026-11-04T18:30:00Z'), 'Default cutoff must be India midnight');
assert(indiaDateLabel(today) === '2026-11-05', 'India start date label must not shift to previous UTC day');
assert(parseImportDate('2026-02-31') === null, 'Invalid start date must be rejected');
assert(parseImportDate('2026-11-06', today) === null, 'Future start date must be rejected');
assert(emailSyncStart(today, today + 3600000, false) === today, 'Overlap must never cross selected start date');
assert(emailSyncStart(today - 7 * 86400000, today, true) === today - 7 * 86400000, 'Changing range must allow historical catch-up');
const hdfc = parseBankEmail(hdfcMail, 'account-a').draft;
assert(slice?.amount === 1 && slice.merchant === 'TEST FRIEND' && slice.account === '••1234', 'Slice ₹1 table must parse correctly');
assert(slice.reference === '123456789012' && slice.date.startsWith('2026-11-05'), 'Slice reference/date must be preserved');
assert(hdfc?.amount === 424.47 && hdfc.account === '••4321' && hdfc.paymentMethod === 'credit-card', 'HDFC debit must not be rejected by Request in safety footer');
assert(hdfc.reference === '987654321012' && hdfc.date.startsWith('2026-10-18'), 'HDFC DD-MM-YY must not use received date');
assert(hdfc.merchant.endsWith('payu@mairtel') && !hdfc.rawText.includes('1800'), 'Keep masked merchant, discard safety footer and phone numbers');
assert(hdfc.merchant.startsWith('***'), 'Masked recipient must remain visibly masked');
assert(!slice.rawText.includes('tracker'), 'Do not persist tracking URLs');
assert(mergeCapture([slice], slice).length === 1, 'Repeated email sync must deduplicate');
const sms = { ...slice, id: 'sms', eventIds: ['sms'], sources: ['sms' as const] };
assert(mergeCapture([sms], slice)[0].sources.length === 2, 'Same bank reference must merge across SMS/email');
assert(mergeCapture([{ ...sms, account: '••9999' }], slice).length === 2, 'Different accounts must not merge even if a reference is reused');
assert(mergeCapture([{ ...sms, status: 'dismissed' }], slice)[0].status === 'dismissed', 'Email must not resurrect a dismissed draft');
assert(!parseIndianEmailDate('31-02-26'), 'Impossible dates must be rejected');
assert(parseIndianEmailDate('05-11-26')?.startsWith('2026-11-05'), 'Ambiguous dates must use Indian day-first order');
assert(!parseBankEmail(mail('spoof', 'noreply@slice.bank.in.attacker.test', sliceBody), 'a').draft, 'Sender lookalike must be rejected');
assert(!parseBankEmail(mail('spoof2', 'noreply@slice.bank.in <attacker@example.com>', sliceBody), 'a').draft, 'Display name must not grant sender access');
for (const changed of [sliceBody.replace('debited', 'will be debited'), sliceBody.replace('debited', 'not debited'), sliceBody.replace('05-Nov-26', '31-Feb-26'), sliceBody.replace('₹1', '₹0')]) {
  assert(!parseBankEmail(mail('invalid', 'noreply@slice.bank.in', changed), 'a').draft, 'Non-final/invalid transaction must not create draft');
}
assert(!parseBankEmail(mail('repayment', 'alerts@hdfcbank.bank.in', hdfcBody.replace('debited', 'credited').replace('from your', 'to your')), 'a').draft, 'Card credits/repayments need a distinct model');
const multipart = structuredClone(sliceMail);
multipart.payload!.mimeType = 'multipart/alternative';
multipart.payload!.body = {};
multipart.payload!.parts = [{ mimeType: 'text/plain', body: { data: Buffer.from('View HTML for transaction details').toString('base64url') } }, { mimeType: 'text/html', body: sliceMail.payload!.body }];
assert(parseBankEmail(multipart, 'a').draft?.amount === 1, 'Fallback to HTML when text alternative has no details');
const broken = structuredClone(sliceMail); broken.payload!.body = { data: '%%%' };
assert(!parseBankEmail(broken, 'a').draft, 'Malformed MIME must not crash sync');
const markdown = 'Hi Test Customer,\n₹1 debited from your slice account xx1234 via UPI.\n| Transaction date | 05-Nov-26 |\n| To | TEST FRIEND |\n| RRN | 123456789012 |';
assert(parseBankEmail(mail('plain', 'noreply@slice.bank.in', markdown, 'text/plain'), 'a').draft?.merchant === 'TEST FRIEND', 'Table-shaped plain text must parse');

export async function verifyEmailSync() {
  const seen = new Set<string>(); const saved: string[] = []; const calls: string[] = [];
  const request: GmailRequest = async <T>(path: string): Promise<T> => {
    calls.push(path);
    if (path.startsWith('messages?')) return (path.includes('pageToken=second')
      ? { messages: [{ id: 'hdfc1' }] }
      : { messages: [{ id: 'slice1' }], nextPageToken: 'second' }) as T;
    return (path.startsWith('messages/slice1?') ? sliceMail : hdfcMail) as T;
  };
  const options = { accountId: 'account-a', after: 1, before: Date.now(), signal: new AbortController().signal, request,
    seen: (id: string) => seen.has(id), save: async (id: string) => { seen.add(id); saved.push(id); } };
  const first = await syncBankEmails(options);
  assert(first.matched === 2 && saved.length === 2, 'Every Gmail page must be processed');
  const rangeIds: string[] = [];
  const bounded = await syncBankEmails({ ...options, after: today, transactionFrom: today,
    seen: () => false, save: async id => { rangeIds.push(id); } });
  assert(bounded.matched === 1 && rangeIds.join() === 'slice1', 'Old transaction in a newly received email must stay outside the selected range');
  const second = await syncBankEmails(options);
  assert(second.alreadyProcessed === 2 && saved.length === 2, 'Processed messages must not be fetched/imported twice');
  assert(calls[0].includes('after%3A') && !calls[0].includes('is%3Aunread'), 'Sync must include read emails and bounded time search');
  const controller = new AbortController(); controller.abort();
  let cancelled = false;
  try { await syncBankEmails({ ...options, signal: controller.signal }); } catch { cancelled = true; }
  assert(cancelled, 'Cancelled sync must stop');
  let failed = false;
  try { await syncBankEmails({ ...options, seen: () => false, save: async () => { throw new Error('disk full'); } }); } catch { failed = true; }
  assert(failed, 'Storage failure must fail sync rather than advance successful checkpoint');
  console.log('Email tests passed: supplied formats, HTML/MIME, dates, senders, card safety, deduplication, pagination, cancellation and retry.');
}
