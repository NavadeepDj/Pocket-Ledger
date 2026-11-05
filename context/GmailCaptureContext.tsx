import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { gmailAvailable, gmailSession, gmailRequest, gmailError, disconnectGmail } from '@/services/gmailAuth';
import { syncBankEmails, type GmailSyncSummary } from '@/services/gmailSync';
import { readGmailSettings, writeGmailSettings, hasProcessedEmail, type GmailSettings } from '@/services/paymentDraftStorage';
import { usePaymentCapture } from './PaymentCaptureContext';
import { emailSyncStart, startOfIndiaDay, parseImportDate, indiaDateLabel } from '@/services/emailWindow';

type GmailContextValue = {
  available: boolean; settings: GmailSettings | null; busy: boolean; error: string;
  summary: GmailSyncSummary | null; connect: () => Promise<void>; disconnect: () => Promise<void>;
  sync: (rescan?: boolean) => Promise<void>;
  cancel: () => void;
  changeImportFrom: (date: string) => Promise<void>;
};
const Context = createContext<GmailContextValue | null>(null);

export function GmailCaptureProvider({ children }: { children: React.ReactNode }) {
  const { importEmail, setEmailStart } = usePaymentCapture();
  const [settings, setSettings] = useState<GmailSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<GmailSyncSummary | null>(null);
  const operation = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const lastAttempt = useRef(0);

  const run = useCallback(async (action: (signal: AbortSignal) => Promise<void>) => {
    if (operation.current) return;
    operation.current = true;
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError(''); lastAttempt.current = Date.now();
    try { await action(abort.signal); }
    catch (e) { if (!abort.signal.aborted) setError(gmailError(e)); }
    finally { operation.current = false; controller.current = null; setBusy(false); }
  }, []);

  const performSync = useCallback(async (state: GmailSettings, signal: AbortSignal, rescan = false) => {
    await setEmailStart(state.importFrom);
    const account = await gmailSession(false);
    if (account.accountId !== state.accountId) throw new Error('The Google account changed. Disconnect and connect the intended Gmail account.');
    const request = gmailRequest();
    const profile = await request<{ emailAddress: string }>('profile', signal);
    if (profile.emailAddress.toLowerCase() !== account.email.toLowerCase()) throw new Error('Gmail account could not be verified. Please reconnect.');
    const started = Date.now();
    const result = await syncBankEmails({ accountId: state.accountId,
      after: emailSyncStart(state.importFrom, state.lastSyncAt, rescan),
      transactionFrom: state.importFrom,
      before: started, signal, request,
      seen: id => hasProcessedEmail(state.accountId, id),
      save: (id, draft) => importEmail(state.accountId, id, draft),
    });
    if (signal.aborted) return;
    const next = { ...state, lastSyncAt: started };
    writeGmailSettings(next); setSettings(next); setSummary(result);
  }, [importEmail, setEmailStart]);

  const sync = useCallback((rescan = false) => run(async signal => {
    const state = readGmailSettings();
    if (!state?.enabled) return;
    await performSync(state, signal, rescan);
  }), [run, performSync]);

  useEffect(() => {
    if (!gmailAvailable) return;
    setSettings(readGmailSettings());
    const resume = () => {
      if (AppState.currentState === 'active' && Date.now() - lastAttempt.current > 60000 && readGmailSettings()?.enabled) void sync();
    };
    resume();
    const subscription = AppState.addEventListener('change', resume);
    const timer = setInterval(resume, 5 * 60000);
    return () => { subscription.remove(); clearInterval(timer); controller.current?.abort(); };
  }, [sync]);

  const connect = () => run(async signal => {
    const account = await gmailSession(true);
    if (signal.aborted) return;
    const previous = readGmailSettings();
    const sameAccount = previous?.accountId === account.accountId;
    const next = { ...account, enabled: true, lastSyncAt: sameAccount ? previous.lastSyncAt : 0,
      importFrom: sameAccount ? previous.importFrom : startOfIndiaDay() };
    writeGmailSettings(next); setSettings(next); setSummary(null);
    await performSync(next, signal);
  });
  const disconnect = () => run(async () => {
    const previous = readGmailSettings();
    // Stop future syncs even if revocation needs connectivity.
    if (previous) writeGmailSettings({ ...previous, enabled: false, email: '' });
    setSettings(null); setSummary(null);
    await disconnectGmail();
  });

  const cancel = () => { controller.current?.abort(); setError('Sync stopped. Drafts already saved are kept; sync again to resume.'); };
  const changeImportFrom = (date: string) => run(async signal => {
    const importFrom = parseImportDate(date);
    if (importFrom === null) throw new Error(`Enter a valid date on or before ${indiaDateLabel(startOfIndiaDay())}.`);
    const state = readGmailSettings();
    if (!state?.enabled) return;
    const next = { ...state, importFrom, lastSyncAt: 0 };
    writeGmailSettings(next); setSettings(next); setSummary(null);
    await setEmailStart(importFrom);
    await performSync(next, signal, true);
  });
  return <Context.Provider value={{ available: gmailAvailable, settings, busy, error, summary, connect, disconnect, sync, cancel, changeImportFrom }}>{children}</Context.Provider>;
}
export function useGmailCapture() {
  const value = useContext(Context);
  if (!value) throw new Error('GmailCaptureProvider is missing.');
  return value;
}
