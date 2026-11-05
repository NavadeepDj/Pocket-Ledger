import { BANK_EMAIL_SENDERS, parseBankEmail, type GmailMessage } from './emailParser';
import type { PaymentDraft } from './paymentDrafts';

export type GmailRequest = <T>(path: string, signal: AbortSignal) => Promise<T>;
export type GmailSyncSummary = { scanned: number; matched: number; skipped: number; alreadyProcessed: number };

export async function syncBankEmails(options: {
  accountId: string; after: number; before: number; transactionFrom?: number; signal: AbortSignal; request: GmailRequest;
  seen: (id: string) => boolean; save: (id: string, draft: PaymentDraft | null) => Promise<void>;
}): Promise<GmailSyncSummary> {
  const { request, signal } = options;
  const result = { scanned: 0, matched: 0, skipped: 0, alreadyProcessed: 0 };
  const query = `{${BANK_EMAIL_SENDERS.map(sender => `from:${sender}`).join(' ')}} after:${Math.floor(options.after / 1000)} before:${Math.ceil(options.before / 1000)}`;
  let pageToken: string | undefined;
  const pages = new Set<string>();
  do {
    if (signal.aborted) throw new Error('Sync cancelled.');
    const page = await request<{ messages?: { id: string }[]; nextPageToken?: string }>(
      `messages?maxResults=100&q=${encodeURIComponent(query)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, signal);
    for (const message of page.messages || []) {
      if (signal.aborted) throw new Error('Sync cancelled.');
      if (options.seen(message.id)) { result.alreadyProcessed++; continue; }
      const mail = await request<GmailMessage>(`messages/${encodeURIComponent(message.id)}?format=full`, signal);
      if (mail.id !== message.id) throw new Error('Gmail returned an unexpected message. Please retry.');
      const parsed = parseBankEmail(mail, options.accountId);
      const tooOld = Boolean(parsed.draft && options.transactionFrom !== undefined && new Date(parsed.draft.date).getTime() < options.transactionFrom);
      if (signal.aborted) throw new Error('Sync cancelled.');
      // Unsupported formats remain eligible for retry after parser improvements.
      if (!tooOld && (parsed.draft || parsed.reason === 'sender')) await options.save(message.id, parsed.draft);
      result.scanned++;
      if (parsed.draft && !tooOld) result.matched++; else result.skipped++;
    }
    pageToken = page.nextPageToken;
    if (pageToken) {
      if (pages.has(pageToken)) throw new Error('Gmail repeated a page. Partial progress is saved; please retry.');
      pages.add(pageToken);
    }
  } while (pageToken);
  return result;
}
