import { mergeCapture, parseCapture, possibleDuplicate } from '../paymentDrafts';
import { parseSmsText } from '../smsParser';
import type { CaptureEvent } from '../../modules/payment-capture';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
const timestamp = new Date('2026-11-04T08:00:00Z').getTime();
const slice = parseCapture({ id: 'slice-small', source: 'notification', sender: 'indwin.c3.shareapp',
  text: 'Paid Rs 10 to Friend. UPI Ref: SLICE12345678', timestamp });
assert(slice?.amount === 10 && slice.sourceApp === 'Slice', 'Small Slice payments must retain their source');
const sliceWithOtherHandle = parseCapture({ id: 'slice-handle', source: 'notification', sender: 'indwin.c3.shareapp',
  text: 'Paid Rs 10 to friend@ybl. UPI Ref: SLICE12345679', timestamp });
assert(sliceWithOtherHandle?.sourceApp === 'Slice', 'Recipient UPI handle must not override the notification sender');
function event(id: string, text: string, source: CaptureEvent['source'] = 'sms'): CaptureEvent {
  return { id, text, source, sender: source === 'sms' ? 'VM-HDFCBK' : 'com.phonepe.app', timestamp };
}

const sms = parseCapture(event('sms1', 'Rs. 450 debited from A/c XX1234 at SWIGGY on 04-Nov-26. UPI Ref: 123456789012'));
const notification = parseCapture(event('n1', 'Paid ₹450 to Swiggy. Transaction ID: 123456789012', 'notification'));
assert(sms && notification, 'Both SMS and notification should be parsed');
assert(sms.reference === '123456789012' && notification.reference === sms.reference, 'References must match');
assert(notification.merchant === 'Swiggy', 'Merchant at end of sentence should be extracted');
assert(sms.merchant === 'SWIGGY', 'Bank debit should extract merchant after at');
assert(notification.date === new Date(timestamp).toISOString(), 'Draft must use alert timestamp');
let drafts = mergeCapture([], sms);
drafts = mergeCapture(drafts, notification);
assert(drafts.length === 1 && drafts[0].sources.length === 2, 'Shared-reference alerts should merge');
drafts = mergeCapture(drafts, sms);
assert(drafts.length === 1 && drafts[0].eventIds.length === 2, 'Retrying queue delivery must be idempotent');
for (const status of ['added', 'dismissed'] as const) {
  const terminal = { ...drafts[0], status };
  const late = { ...notification, eventIds: ['late'], id: 'late' };
  assert(mergeCapture([terminal], late)[0].status === status, 'Late alert must not resurrect completed draft');
  const edited = { ...terminal, amount: 475, direction: 'received' as const,
    note: 'Dinner with friends', eventTag: 'Weekend trip', person: 'Rahul' };
  assert(mergeCapture([edited], late).length === 1, 'Review edits must not break original alert deduplication');
  const merged = mergeCapture([edited], late)[0];
  assert(merged.note === edited.note && merged.eventTag === edited.eventTag && merged.person === edited.person,
    'Late alerts must preserve the reviewed note, event and person');
}
const separate = parseCapture(event('sms2', 'Rs 450 debited at SWIGGY. UPI Ref: 999999999999'));
assert(separate, 'Second real payment should parse');
const two = mergeCapture(drafts, separate);
assert(two.length === 2, 'Different references must not be silently merged');
assert(!possibleDuplicate(separate, [sms, separate]), 'Distinct references from one source indicate separate payments');
assert(possibleDuplicate(separate, [notification, separate]), 'Bank and payment app references may differ: flag for review');
const ambiguous = parseCapture(event('n2', 'Paid ₹450 to Swiggy', 'notification'));
assert(ambiguous, 'Notification without reference should still become draft');
const ambiguousList = mergeCapture(drafts, ambiguous);
assert(ambiguousList.length === 2 && possibleDuplicate(ambiguous, ambiguousList), 'Uncertain duplicates must remain reviewable');
const incoming = parseCapture(event('credit', 'Rs 450 credited to your account. UPI Ref: 123456789012'));
assert(incoming && mergeCapture(drafts, incoming).length === 2, 'Credit and debit must not merge');
for (const text of [
  'Payment of Rs 450 failed. Amount not debited.',
  'Rs 450 paid? Enter OTP 123456 to complete payment.',
  'Swiggy requested Rs 450. You paid yesterday.',
  'Rs 450 payment pending, will be debited shortly.',
  'Reminder: Rs 450 due. Last paid on 01-Nov-26.',
  '₹100 cashback will be credited after your next purchase.',
]) {
  assert(parseCapture(event(text, text)) === null, `Must reject non-final alert: ${text}`);
  assert(parseSmsText(text) === null, 'Manual parser must reject the same non-final alerts');
}
const noRef = parseSmsText('Rs 500 credited by UPI transfer to your bank account.');
assert(noRef && !noRef.reference, 'UPI transfer text must not be mistaken for a reference');
const balanceFirst = parseSmsText('Available balance Rs 9000. Rs 450 was debited at SWIGGY. Ref No 123456789012');
assert(balanceFirst?.amount === 450, 'Prefer transaction amount over an earlier balance amount');
console.log('Payment capture tests passed: parsing, failures, timestamps, deduplication, retries and terminal states.');
