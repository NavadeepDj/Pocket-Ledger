import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { paymentCapture, type CaptureEvent, type CaptureSource, type CaptureStatus } from '@/modules/payment-capture';
import { mergeCapture, parseCapture, type PaymentDraft } from '@/services/paymentDrafts';
import { readPaymentDrafts, writePaymentDrafts, storeEmailDraft, readGmailSettings } from '@/services/paymentDraftStorage';
import { startOfIndiaDay } from '@/services/emailWindow';
import { useExpenses } from './ExpenseContext';

type CaptureContext = {
  available: boolean;
  drafts: PaymentDraft[];
  status: CaptureStatus | null;
  error: string;
  refresh: () => Promise<void>;
  toggleSource: (source: CaptureSource, enabled: boolean) => Promise<void>;
  accept: (draft: PaymentDraft) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  importEmail: (accountId: string, messageId: string, draft: PaymentDraft | null) => Promise<void>;
  setEmailStart: (importFrom: number) => Promise<void>;
};
const Context = createContext<CaptureContext | null>(null);

export function PaymentCaptureProvider({ children }: { children: React.ReactNode }) {
  const { addExpense } = useExpenses();
  const [drafts, setDrafts] = useState<PaymentDraft[]>([]);
  const [status, setStatus] = useState<CaptureStatus | null>(null);
  const [error, setError] = useState('');
  const [emailStart, updateEmailStart] = useState(startOfIndiaDay);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const loaded = useRef(false);
  const serialize = useCallback((work: () => Promise<void>) => {
    const next = queue.current.then(work);
    queue.current = next.catch(() => {});
    return next;
  }, []);

  const refresh = useCallback(() => serialize(async () => {
    updateEmailStart(readGmailSettings()?.importFrom ?? startOfIndiaDay());
    if (!paymentCapture) {
      if (!loaded.current) { setDrafts(readPaymentDrafts()); loaded.current = true; }
      return;
    }
    await paymentCapture.setEnabledAsync('sms', false);
    const nextStatus = await paymentCapture.getStatusAsync();
    setStatus(current => current && Object.keys(nextStatus).every(key =>
      current[key as keyof CaptureStatus] === nextStatus[key as keyof CaptureStatus]) ? current : nextStatus);
    const events: CaptureEvent[] = JSON.parse(await paymentCapture.getPendingAsync());
    if (events.length || !loaded.current) {
      let current = readPaymentDrafts();
      for (const event of events) {
        const parsed = event.source === 'sms' ? null : parseCapture(event);
        if (parsed) current = mergeCapture(current, parsed);
      }
      if (events.length) writePaymentDrafts(current);
      setDrafts(current);
      loaded.current = true;
    }
    // Acknowledge only after durable storage. A crash before this point safely retries the batch.
    if (events.length) await paymentCapture.acknowledgeAsync(events.map(event => event.id));
    setError('');
  }), [serialize]);

  useEffect(() => {
    const sync = () => { void refresh().catch(() => setError('Could not load payment drafts. Please retry.')); };
    sync();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') sync(); }, 5000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [refresh]);

  const toggleSource = async (source: CaptureSource, enabled: boolean) => {
    if (!paymentCapture || source === 'sms') return;
    await paymentCapture.setEnabledAsync(source, enabled);
    if (source === 'notification' && enabled && !(await paymentCapture.getStatusAsync()).notificationGranted) {
      await paymentCapture.openNotificationSettingsAsync();
    }
    await refresh();
  };

  const accept = (edited: PaymentDraft) => serialize(async () => {
    const current = readPaymentDrafts();
    const original = current.find(d => d.id === edited.id);
    if (!original || original.status !== 'pending') return;
    if (!Number.isFinite(edited.amount) || edited.amount <= 0 || !edited.merchant.trim() ||
      !Number.isFinite(new Date(edited.date).getTime())) throw new Error('Check the amount, merchant and date.');
    // Stable ID makes accepting safe to retry if the app closes between these two writes.
    await addExpense({
      id: original.id, amount: edited.amount, category: edited.category,
      note: edited.note?.trim() || edited.merchant, eventTag: edited.eventTag?.trim() || '', direction: edited.direction, person: edited.person || '',
      subContext: edited.subContext, date: edited.date,
    });
    const next = current.map(d => d.id === original.id ? { ...edited, eventIds: d.eventIds,
      sources: d.sources, rawText: '', status: 'added' as const } : d);
    writePaymentDrafts(next);
    setDrafts(next);
  });

  const dismiss = (id: string) => serialize(async () => {
    const next = readPaymentDrafts().map(d => d.id === id ? { ...d, rawText: '', status: 'dismissed' as const } : d);
    writePaymentDrafts(next);
    setDrafts(next);
  });

  const importEmail = useCallback((accountId: string, messageId: string, draft: PaymentDraft | null) => serialize(async () => {
    setDrafts(storeEmailDraft(accountId, messageId, draft));
  }), [serialize]);
  const setEmailStart = useCallback((importFrom: number) => serialize(async () => {
    updateEmailStart(importFrom);
    setDrafts(readPaymentDrafts());
  }), [serialize]);

  const visibleDrafts = drafts.filter(d => d.status !== 'pending' || !d.sources.includes('email') || new Date(d.date).getTime() >= emailStart);
  return <Context.Provider value={{ available: Boolean(paymentCapture), drafts: visibleDrafts, status, error,
    refresh, toggleSource, accept, dismiss, importEmail, setEmailStart }}>{children}</Context.Provider>;
}

export function usePaymentCapture() {
  const context = useContext(Context);
  if (!context) throw new Error('usePaymentCapture must be used inside PaymentCaptureProvider');
  return context;
}
