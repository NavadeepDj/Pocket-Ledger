import { toByteArray } from 'base64-js';
import { inferCategoryAndContext } from './smsParser';
import type { PaymentDraft } from './paymentDrafts';

export const BANK_EMAIL_SENDERS = ['noreply@slice.bank.in', 'alerts@hdfcbank.bank.in'] as const;
export type GmailPart = { mimeType?: string; filename?: string; body?: { data?: string; attachmentId?: string }; parts?: GmailPart[] };
export type GmailMessage = { id: string; internalDate?: string; payload?: GmailPart & { headers?: { name: string; value: string }[] } };
export type EmailResult = { draft: PaymentDraft | null; reason?: 'sender' | 'body' | 'unsupported' };

function decode(data: string) {
  if (data.length > 1_500_000) throw new Error('Email body exceeds the supported size.');
  const base = data.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = toByteArray(base.padEnd(Math.ceil(base.length / 4) * 4, '='));
  // decodeURIComponent is available in Hermes and handles UTF-8, including the rupee sign.
  return decodeURIComponent(Array.from(bytes, byte => `%${byte.toString(16).padStart(2, '0')}`).join(''));
}

export function emailToText(input: string): string {
  return input
    .replace(/<(script|style|blockquote)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/!?(?:\[image\]|\[\s*\])\([^)]*\)/gi, '')
    .replace(/<\s*(?:br\s*\/?|\/?(?:p|div|tr|td|th|table|li|h[1-6]))\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
      const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
    })
    .replace(/&(nbsp|amp|lt|gt|quot|apos|rupee);/gi, (_, entity: string) =>
      ({ nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rupee: '₹' }[entity.toLowerCase()] || ''))
    .replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/\|/g, '\n')
    .replace(/\r/g, '').replace(/[ \t]+/g, ' ')
    .split('\n').map(line => line.trim()).filter(line => line && !/^[:\- ]+$/.test(line)).join('\n');
}

function bodies(part: GmailPart, depth = 0): string[] {
  if (depth > 12 || part.filename) return [];
  if (part.mimeType === 'message/rfc822') return []; // Never parse forwarded attached mail.
  const children = part.parts?.flatMap(child => bodies(child, depth + 1)) || [];
  if (children.length) return children;
  if (!part.body?.data || !['text/plain', 'text/html'].includes(part.mimeType || '')) return [];
  try { return [emailToText(decode(part.body.data))]; } catch { return []; }
}

export function senderAddress(value: string): string {
  const address = /<([^<>]+)>\s*$/.exec(value)?.[1] || value.trim();
  return /^[^\s<>@]+@[^\s<>@]+$/.test(address) ? address.toLowerCase() : '';
}

export function parseIndianEmailDate(value: string): string | null {
  const match = /\b(\d{1,2})[-/](\d{1,2}|[A-Za-z]{3})[-/](\d{4}|\d{2})\b/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = /^\d+$/.test(match[2]) ? Number(match[2]) :
    ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(match[2].toLowerCase()) + 1;
  const year = Number(match[3]) + (match[3].length === 2 ? 2000 : 0);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (month < 1 || month > 12 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  // Email provides a date only: noon India time avoids locale-dependent DD/MM parsing.
  return new Date(Date.UTC(year, month - 1, day, 6, 30)).toISOString();
}

export function parseBankEmail(message: GmailMessage, accountId: string): EmailResult {
  const headers = message.payload?.headers || [];
  const header = (name: string) => headers.find(h => h.name.toLowerCase() === name)?.value || '';
  const sender = senderAddress(header('from'));
  if (!(BANK_EMAIL_SENDERS as readonly string[]).includes(sender)) return { draft: null, reason: 'sender' };
  if (/\b(otp|verification|failed|declined|pending|statement|reminder)\b|^(?:re|fw|fwd):/i.test(header('subject'))) return { draft: null, reason: 'unsupported' };
  const variants = message.payload ? bodies(message.payload) : [];
  if (!variants.length) return { draft: null, reason: 'body' };
  for (const text of variants) {
    // Footer instructions (including "Cards > Request") are not transaction status.
    const core = text.split(/\b(?:Important Note|What You Can Do|Best,|Warm Regards|Digital safety tips)\b/i)[0];
    if (/\b(?:otp|one.time password|failed|declined|pending|processing|not debited|will be|requested|payment request)\b/i.test(core)) continue;
    if (/\b(?:card\s+(?:bill\s+)?(?:payment|repayment)|(?:payment|repayment)\s+(?:towards|of|for)\s+(?:your\s+)?(?:credit\s+)?card)\b/i.test(core)) continue;
    const transaction = /(?:₹|Rs\.?|INR)\s*((?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?)\s+(?:has been\s+)?(debited|credited)\s+(?:from|to)\s+(?:your\s+)?([^\n]+)/i.exec(core);
    if (!transaction) continue;
    const amount = Number(transaction[1].replace(/,/g, ''));
    const isCard = /credit card/i.test(transaction[3]);
    // Card repayments and card credits need a separate transfer/refund model.
    if (isCard && transaction[2].toLowerCase() === 'credited') continue;
    const direction = transaction[2].toLowerCase() === 'debited' ? 'spent' : 'received';
    const account = /(?:xx|x{2,}|ending\s*)\s*(\d{4})\b/i.exec(transaction[3])?.[1];
    const reference = /\b(?:RRN|UPI Transaction Reference Number|UPI Ref(?:erence)?)\s*[:#]?\s*(\d{12})\b/i.exec(core)?.[1];
    const dateValue = /\b(?:Transaction date|Date)\s*:?\s*([^\n]+)/i.exec(core)?.[1];
    const date = dateValue ? parseIndianEmailDate(dateValue) : null;
    const recipient = direction === 'spent' ? /(?:^|\n)(?:Paid to|To)\s*:?\s*([^\n]+)/i : /(?:^|\n)(?:Received from|From)\s*:?\s*([^\n]+)/i;
    const merchant = recipient.exec(core)?.[1]?.trim();
    if (!amount || !Number.isFinite(amount) || !reference || !date || !merchant || !account) continue;
    const bank = sender.startsWith('noreply@slice') ? 'Slice' : 'HDFC Bank';
    const eventId = `gmail:${accountId}:${message.id}`;
    const { category, subContext } = inferCategoryAndContext(merchant, merchant);
    return { draft: {
      id: `capture-${eventId}`, eventIds: [eventId], sources: ['email'], status: 'pending',
      amount, detectedAmount: amount, direction, detectedDirection: direction,
      capturedAt: Number(message.internalDate) || new Date(date).getTime(), date,
      merchant, category, subContext, account: `••${account}`, reference, sourceApp: bank,
      confidence: 'high', paymentMethod: isCard ? 'credit-card' : 'bank',
      rawText: `${bank} email\n${direction === 'spent' ? 'Paid' : 'Received'} ₹${amount}\n${merchant}\n${isCard ? 'Card' : 'Account'} ••${account}\nDate: ${dateValue}\nUPI reference: ${reference}`,
    } };
  }
  return { draft: null, reason: 'unsupported' };
}
