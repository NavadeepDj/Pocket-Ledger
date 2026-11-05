import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useGmailCapture } from '@/context/GmailCaptureContext';
import colors from '@/constants/colors';
import { indiaDateLabel, parseImportDate, startOfIndiaDay } from '@/services/emailWindow';

const p = colors.light;
export function GmailCaptureCard() {
  const gmail = useGmailCapture();
  const connected = gmail.settings?.enabled;
  const [expanded, setExpanded] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [date, setDate] = useState(indiaDateLabel(startOfIndiaDay()));
  useEffect(() => { setDate(indiaDateLabel(gmail.settings?.importFrom ?? startOfIndiaDay())); }, [gmail.settings?.importFrom]);
  const connect = () => Alert.alert('Connect Gmail for payment drafts?',
    'Google grants read access to your mailbox, not only bank emails. Pocket Ledger searches supported Slice and HDFC sender addresses and parses transaction details on this phone. It never sends, deletes or marks emails as read. Import starts today by default; you can change the start date after connecting. Drafts still need your review. You can disconnect at any time.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Continue with Google', onPress: () => void gmail.connect() }]);
  return <View style={styles.card}>
    <Text style={styles.kicker}>EMAIL CAPTURE</Text>
    <Text style={styles.title}>{connected ? 'Gmail connected' : 'Bank emails → payment drafts'}</Text>
    {connected && <View style={styles.actions}>
      <Text style={styles.small}>From {indiaDateLabel(gmail.settings!.importFrom)}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)}><Text style={styles.link}>{expanded ? 'Hide settings' : 'Manage email capture'}</Text></Pressable>
    </View>}
    {(!connected || expanded) && <Text style={styles.body}>Capture small payments and RuPay credit-card UPI purchases from supported Slice and HDFC emails.</Text>}
    {!gmail.available ? <Text style={styles.note}>Requires the new Android APK with Google sign-in. Gmail is unavailable in this build.</Text> : <>
      {connected && expanded && <Text selectable style={styles.body}>{gmail.settings?.email}</Text>}
      {connected && expanded && <View style={styles.dateBox}>
        <Text style={styles.kicker}>IMPORT PAYMENTS FROM</Text>
        <Text style={styles.body}>{indiaDateLabel(gmail.settings!.importFrom)} onward · India time</Text>
        <Text style={styles.small}>Defaults to the day you first connect. Earlier drafts are hidden, not deleted; existing ledger entries stay unchanged.</Text>
        {!editingDate ? <Pressable accessibilityRole="button" disabled={gmail.busy} onPress={() => setEditingDate(true)}><Text style={styles.link}>Change start date</Text></Pressable> : <>
          <TextInput accessibilityLabel="Email import start date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" maxLength={10} autoCapitalize="none" editable={!gmail.busy} style={styles.input} />
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={gmail.busy} onPress={() => setDate(indiaDateLabel(startOfIndiaDay()))}><Text style={styles.link}>Use today</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={gmail.busy} onPress={() => {
              if (parseImportDate(date) === null) { Alert.alert('Check the start date', 'Use YYYY-MM-DD and choose today or an earlier date, from year 2000 onward.'); return; }
              setEditingDate(false); void gmail.changeImportFrom(date);
            }}><Text style={styles.link}>Apply & sync</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={gmail.busy} onPress={() => { setEditingDate(false); setDate(indiaDateLabel(gmail.settings!.importFrom)); }}><Text style={styles.link}>Cancel</Text></Pressable>
          </View>
        </>}
      </View>}
      <Text style={styles.small}>{connected
        ? gmail.settings?.lastSyncAt ? `Last successful sync: ${new Date(gmail.settings.lastSyncAt).toLocaleString('en-IN')}` : 'Connected · first sync not completed'
        : 'Connect once, then sync on app open and periodically while the app is active.'}</Text>
      {gmail.summary && <Text style={styles.small}>{gmail.summary.matched} payment alerts matched · {gmail.summary.skipped} unsupported or non-payment emails skipped · {gmail.summary.alreadyProcessed} already processed</Text>}
      {gmail.error ? <Text accessibilityRole="alert" style={styles.note}>{gmail.error}</Text> : null}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={gmail.busy} onPress={connected ? () => void gmail.sync() : connect} style={styles.button}>
          <Text style={styles.buttonText}>{gmail.busy ? 'Syncing…' : connected ? 'Sync Gmail' : 'Connect Gmail'}</Text>
        </Pressable>
        {gmail.busy ? <><ActivityIndicator color={p.foreground} /><Pressable accessibilityRole="button" onPress={gmail.cancel}><Text style={styles.link}>Stop sync</Text></Pressable></> : connected && expanded && <>
          <Pressable accessibilityRole="button" onPress={() => void gmail.sync(true)}><Text style={styles.link}>Recheck date range</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => Alert.alert('Disconnect Gmail?', 'Automatic email sync will stop and Google access will be revoked. Existing drafts and ledger entries stay on this phone.', [
            { text: 'Cancel', style: 'cancel' }, { text: 'Disconnect', style: 'destructive', onPress: () => void gmail.disconnect() },
          ])}><Text style={styles.link}>Disconnect</Text></Pressable>
        </>}
      </View>
    </>}
    {(!connected || expanded) && <Text style={styles.small}>Sync runs when Pocket Ledger is open, not continuously while closed. SBI and other email layouts need tested examples. Statements, OTPs and unsupported card repayments are not imported.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, gap: 10, backgroundColor: p.secondary, borderColor: p.border, borderWidth: 1 },
  kicker: { fontSize: 10, letterSpacing: 1, color: p.foreground, fontFamily: 'Inter_700Bold' },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: p.foreground },
  body: { fontSize: 13, lineHeight: 20, color: p.foreground },
  small: { fontSize: 12, lineHeight: 18, color: p.foreground },
  note: { padding: 10, borderRadius: 10, backgroundColor: p.card, fontSize: 12, lineHeight: 18, color: p.foreground },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 },
  button: { padding: 12, backgroundColor: p.foreground, borderRadius: 10 },
  buttonText: { color: p.primaryForeground, fontFamily: 'Inter_600SemiBold' },
  link: { color: p.foreground, paddingVertical: 10, fontSize: 12, textDecorationLine: 'underline' },
  dateBox: { padding: 12, gap: 6, borderRadius: 12, backgroundColor: p.card },
  input: { borderWidth: 1, borderColor: p.input, borderRadius: 8, padding: 10, color: p.foreground, fontSize: 15 },
});
