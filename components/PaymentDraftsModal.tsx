import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePaymentCapture } from '@/context/PaymentCaptureContext';
import { useExpenses } from '@/context/ExpenseContext';
import { possibleDuplicate, type PaymentDraft } from '@/services/paymentDrafts';
import { paymentCapture, type CaptureSource } from '@/modules/payment-capture';
import colors from '@/constants/colors';
import { EditExpenseModal } from './EditExpenseModal';
import { GmailCaptureCard } from './GmailCaptureCard';
import { useGmailCapture } from '@/context/GmailCaptureContext';

const palette = colors.light;
export function PaymentDraftsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { available, drafts, status, error, refresh, toggleSource, accept, dismiss } = usePaymentCapture();
  const { expenses } = useExpenses();
  const gmail = useGmailCapture();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState<PaymentDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const pending = drafts.filter(d => d.status === 'pending');
  const notificationsReady = Boolean(status?.notificationEnabled && status.notificationGranted && status.notificationConnected !== false);
  const readyCount = Number(notificationsReady);

  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await work(); }
    catch (e) { Alert.alert('Payment drafts', e instanceof Error ? e.message : 'Something went wrong. Please retry.'); }
    finally { setBusy(false); }
  };

  const configure = (source: CaptureSource, enabled: boolean) => {
    if (!enabled) { void run(() => toggleSource(source, false)); return; }
    Alert.alert('Create drafts from payment notifications?',
      'Android notification access can expose notification contents. Pocket Ledger only inspects supported bank and payment apps and creates drafts for your review. Enable Pocket Ledger on the next settings screen.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Continue', onPress: () => void run(() => toggleSource(source, true)) }]);
  };

  const startReview = (draft: PaymentDraft) => setEditing({ ...draft });
  const reviewExpense = useMemo(() => editing ? ({ id: editing.id, amount: editing.amount,
    category: editing.category, subContext: editing.subContext, direction: editing.direction,
    person: editing.person || '', note: editing.note ?? '', eventTag: editing.eventTag ?? '', date: editing.date }) : null, [editing]);
  if (editing && reviewExpense) return <EditExpenseModal visible={visible} expense={reviewExpense}
    existingEvents={[...new Set(expenses.map(e => e.eventTag).filter(Boolean))]}
    reviewDetails={`${editing.merchant}${editing.account ? ` / ${editing.account}` : ''}${possibleDuplicate(editing, drafts) ? ' / Possible duplicate: check before adding' : ''}`}
    onClose={() => setEditing(null)} onReviewSave={async entry => {
      await accept({ ...editing, ...entry, merchant: editing.merchant, date: editing.date });
    }} />;
  const close = () => { if (!busy) { setEditing(null); onClose(); } };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>REVIEW BEFORE ADDING</Text>
              <Text style={styles.title}>{editing ? 'Review payment' : `Payment drafts (${pending.length})`}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close payment drafts" disabled={busy} onPress={close}><Text style={styles.link}>Close</Text></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
            {!editing ? <>
              <Text style={styles.body}>New payment alerts become drafts. Nothing enters your ledger until you confirm it.</Text>
              <GmailCaptureCard />
              {!available ? <Text style={styles.notice}>{Platform.OS === 'android'
                ? 'Automatic capture needs a new Pocket Ledger Android build. It is unavailable in Expo Go.'
                : 'Automatic capture is available in the Android app. SMS import is paused.'}</Text> : <>
                <View style={styles.health}>
                  <Text style={styles.heading}>{gmail.settings?.enabled ? 'Optional device alerts' : !status ? 'Checking device capture…' : readyCount === 1 ? 'Notifications ready' : 'Notification setup'}</Text>
                  <Text style={styles.body}>{gmail.settings?.enabled ? 'Gmail works without SMS or notification access. You can keep these sources off or use them for additional coverage.' : readyCount ? 'Available alerts are saved on this phone. Review them here before adding.' : 'You can use Gmail above, or enable payment notifications below.'}</Text>
                  {readyCount === 1 && <Text style={styles.small}>Bank SMS is paused. Gmail and payment notifications remain available.</Text>}
                  {(readyCount > 0 || gmail.settings?.enabled) && <Pressable accessibilityRole="button" accessibilityState={{ expanded: showSetup }} onPress={() => setShowSetup(!showSetup)}><Text style={styles.link}>{showSetup ? 'Hide capture settings' : 'Manage device sources'}</Text></Pressable>}
                </View>
                {((readyCount === 0 && !gmail.settings?.enabled) || showSetup) && <View style={styles.card}>
                  <Text style={styles.heading}>Capture sources</Text><Text style={styles.small}>Bank SMS - Paused for now</Text>
                  <Text style={styles.small}>PhonePe, Slice, Google Pay, Paytm, BHIM and selected bank apps. Bank SMS capture is paused.</Text>
                  {(['notification'] as const).map(source => {
                    const enabled = status?.notificationEnabled;
                    const granted = status?.notificationGranted;
                    const reconnecting = source === 'notification' && enabled && granted && status?.notificationConnected === false;
                    return <View key={source} style={styles.sourceRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.heading}>{'Payment notifications'}</Text>
                        <Text style={styles.small}>{reconnecting ? 'Reconnecting · check access if this persists' : enabled && granted ? 'Ready to capture' : enabled ? 'Permission needed' : 'Not enabled'}</Text>
                      </View>
                      <Pressable accessibilityRole="button" accessibilityLabel={`${enabled ? 'Disable' : 'Enable'} ${'payment notifications'}`} disabled={busy || !status} onPress={() => configure(source, !enabled)}><Text style={styles.link}>{enabled ? 'Turn off' : 'Enable'}</Text></Pressable>
                      {enabled && (!granted || reconnecting) && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(async () => {
                        await paymentCapture?.openNotificationSettingsAsync();
                      })}><Text style={styles.link}>Settings</Text></Pressable>}
                    </View>;
                  })}
                  <Text style={styles.small}>You can turn notifications off here. Android may pause capture after a force stop or permission revocation. Reopen the app to check access.</Text>
                </View>}
                <Pressable disabled={busy} onPress={() => void run(refresh)}><Text style={styles.link}>Refresh drafts</Text></Pressable>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: showHelp }} onPress={() => setShowHelp(!showHelp)}><Text style={styles.link}>{showHelp ? 'Hide capture help' : 'Missing a payment?'}</Text></Pressable>
                {showHelp && <View style={styles.card}>
                  <Text style={styles.heading}>Check the original alert</Text>
                  <Text style={styles.body}>Check that a supported bank email arrived, then use Sync Gmail. Make sure its payment date is within your selected import range.</Text>
                  <Text style={styles.body}>For payment notifications, check access above. A success screen inside a payment app is not a notification.</Text>
                  <Text style={styles.small}>Unsupported emails may be skipped. You can always add the payment manually. Bank SMS is paused.</Text>
                </View>}
              </>}
              {error ? <Text style={styles.notice}>{error}</Text> : null}
              {(available || gmail.available) && pending.length === 0 && <View style={styles.card}><Text style={styles.heading}>No drafts to review</Text><Text style={styles.body}>Connect Gmail or enable an alert source above. Detected payments will appear here for review. Email sync may skip unsupported formats; check the sync result above.</Text><Text style={styles.small}>You can always add a payment manually.</Text></View>}
              {pending.map(draft => <View key={draft.id} style={styles.card}>
                <View style={styles.paymentHeader}>
                  <View style={{ flex: 1 }}><Text style={styles.small}>{draft.direction === 'spent' ? 'PAID' : 'RECEIVED'} · {draft.sourceApp || 'Payment alert'}</Text><Text style={styles.heading}>{draft.merchant}</Text></View>
                  <Text style={styles.amount}>₹{draft.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                </View>
                <Text style={styles.small}>{draft.sources.map(s => s === 'sms' ? 'SMS' : s === 'email' ? 'Email' : 'Notification').join(' + ')} · {new Date(draft.date).toLocaleDateString('en-IN')}{draft.paymentMethod === 'credit-card' ? ' · Credit card purchase' : ''}</Text>
                {draft.account && <Text style={styles.small}>{draft.paymentMethod === 'credit-card' ? 'Card' : 'Account'} {draft.account}</Text>}
                <Text style={styles.small}>{draft.category}{draft.reference ? ` · Ref ${draft.reference}` : ''}</Text>
                {possibleDuplicate(draft, drafts) && <Text style={styles.notice}>Possible duplicate of another draft or an added payment. Check before adding.</Text>}
                <View style={styles.actions}>
                  <Pressable disabled={busy} onPress={() => startReview(draft)} style={styles.button}><Text style={styles.buttonText}>Review</Text></Pressable>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => Alert.alert('Dismiss this draft?', 'This removes it from review without adding it to your ledger.', [{ text: 'Keep draft', style: 'cancel' }, { text: 'Dismiss', style: 'destructive', onPress: () => void run(() => dismiss(draft.id)) }])}><Text style={styles.link}>Dismiss</Text></Pressable>
                </View>
              </View>)}
            </> : null}
            {busy && <ActivityIndicator color={palette.primary} />}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(25,51,47,0.4)' },
  sheet: { backgroundColor: palette.background, maxHeight: '92%', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  kicker: { fontSize: 10, letterSpacing: 1.2, fontFamily: 'Inter_700Bold', color: palette.primary },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', color: palette.foreground, marginTop: 4 },
  heading: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: palette.foreground },
  body: { fontSize: 13, lineHeight: 20, color: palette.foreground },
  small: { fontSize: 11, lineHeight: 17, color: palette.mutedForeground },
  label: { fontSize: 11, fontFamily: 'Inter_700Bold', color: palette.mutedForeground },
  card: { borderRadius: 16, backgroundColor: palette.card, padding: 14, gap: 10, borderWidth: 1, borderColor: palette.input },
  health: { borderRadius: 16, backgroundColor: palette.secondary, padding: 16, gap: 6 },
  paymentHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  amount: { fontSize: 23, fontFamily: 'Inter_700Bold', color: palette.foreground },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  link: { fontSize: 13, color: palette.primary, fontFamily: 'Inter_600SemiBold', paddingVertical: 10 },
  notice: { backgroundColor: '#FFF4D6', padding: 12, borderRadius: 10, fontSize: 12, lineHeight: 18, color: '#785414' },
  input: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.input, borderRadius: 12, padding: 12, color: palette.foreground, fontSize: 15 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  button: { backgroundColor: palette.primary, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center' },
  buttonText: { color: palette.primaryForeground, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.input },
  selected: { backgroundColor: palette.primary, borderColor: palette.primary },
});
