import type { CaptureEvent, CaptureSource } from '@/modules/payment-capture';
import { parseSmsText, type ParsedTransaction } from './smsParser';

export type PaymentDraft = ParsedTransaction & {
  note?: string;
  eventTag?: string;
  eventIds: string[];
  sources: (CaptureSource | 'email')[];
  paymentMethod?: 'bank' | 'credit-card';
  capturedAt: number;
  detectedAmount: number;
  detectedDirection: ParsedTransaction['direction'];
  status: 'pending' | 'added' | 'dismissed';
};

const terminalFailure = /\b(otp|one[ -]time password|verification code|failed|declined|pending|processing|unsuccessful|request|requested|reminder|due|scheduled|will be|could not|not debited|not paid|not sent)\b/i;

export function parseCapture(event: CaptureEvent): PaymentDraft | null {
  if (terminalFailure.test(event.text) || !Number.isFinite(event.timestamp) ||
    !Number.isFinite(new Date(event.timestamp).getTime())) return null;
  const parsed = parseSmsText(event.text);
  if (!parsed) return null;
  return {
    ...parsed,
    id: `capture-${event.id}`,
    // The alert timestamp is reliable even when the message only contains a date.
    date: new Date(event.timestamp).toISOString(),
    capturedAt: event.timestamp,
    detectedAmount: parsed.amount,
    detectedDirection: parsed.direction,
    sourceApp: event.source === 'notification'
      ? ({ 'com.phonepe.app': 'PhonePe', 'com.google.android.apps.nbu.paisa.user': 'Google Pay',
        'net.one97.paytm': 'Paytm', 'indwin.c3.shareapp': 'Slice' }[event.sender] || parsed.sourceApp || 'Bank / payment app')
      : parsed.sourceApp,
    eventIds: [event.id],
    sources: [event.source],
    status: 'pending',
  };
}

export function mergeCapture(drafts: PaymentDraft[], incoming: PaymentDraft): PaymentDraft[] {
  if (drafts.some(d => d.eventIds.some(id => incoming.eventIds.includes(id)))) return drafts;
  const existing = drafts.find(d =>
    Boolean(d.reference && incoming.reference) &&
    d.reference!.toLowerCase() === incoming.reference!.toLowerCase() &&
    (d.detectedDirection ?? d.direction) === incoming.detectedDirection &&
    (d.detectedAmount ?? d.amount) === incoming.detectedAmount &&
    (!d.account || !incoming.account || d.account === incoming.account) &&
    Math.abs(d.capturedAt - incoming.capturedAt) < 30 * 24 * 60 * 60 * 1000,
  );
  if (!existing) return [incoming, ...drafts];
  // Keep reviewed edits and terminal states: a later bank alert must not resurrect an expense.
  return drafts.map(d => d.id !== existing.id ? d : {
    ...d,
    eventIds: [...d.eventIds, ...incoming.eventIds],
    sources: [...new Set([...d.sources, ...incoming.sources])],
  });
}

export function possibleDuplicate(draft: PaymentDraft, drafts: PaymentDraft[]): boolean {
  return drafts.some(other => other.id !== draft.id && other.status !== 'dismissed' &&
    other.amount === draft.amount && other.direction === draft.direction &&
    Math.abs(other.capturedAt - draft.capturedAt) <= 2 * 60 * 1000 &&
    // A bank's reference and a payment app's transaction ID can differ for the same payment.
    // Distinct references from the same source are more likely separate transactions.
    (!(other.reference && draft.reference && other.reference.toLowerCase() !== draft.reference.toLowerCase()) ||
      !other.sources.some(source => draft.sources.includes(source))));
}
