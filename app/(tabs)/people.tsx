import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { Expense, useExpenses } from '@/context/ExpenseContext';

const palette = colors.light;
const currency = (amount: number) =>
  `₹${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

type PersonLedger = {
  name: string;
  transactions: Expense[];
  paid: number;
  received: number;
  balance: number;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function balanceCopy(balance: number) {
  if (balance > 0) return { label: 'owes you', color: palette.primary };
  if (balance < 0) return { label: 'you owe', color: palette.foreground };
  return { label: 'settled', color: palette.mutedForeground };
}

function PersonDetail({ ledger, onClose }: { ledger: PersonLedger; onClose: () => void }) {
  const balance = balanceCopy(ledger.balance);
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalDismiss} onPress={onClose} />
        <View style={styles.detailSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.detailHeader}>
            <View style={styles.avatarLarge}><Text style={styles.avatarText}>{ledger.name.slice(0, 1).toUpperCase()}</Text></View>
            <View style={styles.detailHeaderText}><Text style={styles.detailKicker}>PERSONAL LEDGER</Text><Text style={styles.detailTitle}>{ledger.name}</Text></View>
            <Pressable testID="close-person-ledger" onPress={onClose} style={styles.closeButton}><Feather name="x" size={19} color={palette.foreground} /></Pressable>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
            <Text style={[styles.balanceAmount, { color: balance.color }]}>{currency(ledger.balance)}</Text>
            <Text style={[styles.balanceDirection, { color: balance.color }]}>{balance.label}</Text>
          </View>
          <View style={styles.detailStats}>
            <View><Text style={styles.detailStatLabel}>YOU PAID</Text><Text style={styles.detailStatValue}>{currency(ledger.paid)}</Text></View>
            <View style={styles.detailStatDivider} />
            <View><Text style={styles.detailStatLabel}>YOU RECEIVED</Text><Text style={styles.detailStatValue}>{currency(ledger.received)}</Text></View>
          </View>
          <Text style={styles.historyLabel}>TRANSACTION HISTORY</Text>
          <FlatList
            data={ledger.transactions}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.historyList}
            renderItem={({ item }) => (
              <View style={styles.historyRow}>
                <View style={[styles.historyIcon, { backgroundColor: item.direction === 'received' ? '#E6F1EA' : '#F9DED7' }]}>
                  <Feather name={item.direction === 'received' ? 'arrow-down-left' : 'arrow-up-right'} size={17} color={item.direction === 'received' ? palette.foreground : palette.primary} />
                </View>
                <View style={styles.historyMain}>
                  <Text style={styles.historyTitle}>{item.direction === 'received' ? 'You received' : 'You paid'}</Text>
                  <Text style={styles.historyMeta}>{item.note || 'Transaction'} · {formatDate(item.date)}</Text>
                </View>
                <Text style={[styles.historyAmount, item.direction === 'received' && styles.receivedAmount]}>{item.direction === 'received' ? '+' : '−'}{currency(item.amount)}</Text>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function PeopleScreen() {
  const insets = useSafeAreaInsets();
  const { expenses, loading, reload } = useExpenses();
  const [selectedPerson, setSelectedPerson] = useState<PersonLedger | null>(null);
  const ledgers = useMemo(() => {
    const map = new Map<string, PersonLedger>();
    expenses.filter((expense) => expense.person.trim()).forEach((expense) => {
      const name = expense.person.trim();
      const existing = map.get(name) ?? { name, transactions: [], paid: 0, received: 0, balance: 0 };
      existing.transactions.push(expense);
      if (expense.direction === 'received') existing.received += expense.amount;
      else existing.paid += expense.amount;
      existing.balance = existing.paid - existing.received;
      map.set(name, existing);
    });
    return Array.from(map.values()).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [expenses]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={ledgers}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => {
          const balance = balanceCopy(item.balance);
          return (
            <Pressable testID={`person-${item.name}`} onPress={() => setSelectedPerson(item)} style={({ pressed }) => [styles.personRow, pressed && styles.pressed]}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text></View>
              <View style={styles.personMain}><Text style={styles.personName}>{item.name}</Text><Text style={styles.personMeta}>{item.transactions.length} {item.transactions.length === 1 ? 'transaction' : 'transactions'}</Text></View>
              <View style={styles.personBalance}><Text style={[styles.personAmount, { color: balance.color }]}>{currency(item.balance)}</Text><Text style={[styles.personDirection, { color: balance.color }]}>{balance.label}</Text></View>
              <Feather name="chevron-right" size={17} color={palette.mutedForeground} />
            </Pressable>
          );
        }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) + 84 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={ledgers.length > 0}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} tintColor={palette.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.kicker}>MONEY BETWEEN YOU</Text>
            <Text style={styles.title}>People</Text>
            <Text style={styles.subtitle}>Keep track of who owes who, without doing the math.</Text>
            <View style={styles.rule}><View style={styles.ruleAccent} /><View style={styles.ruleRest} /></View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Feather name="users" size={24} color={palette.primary} /></View>
            <Text style={styles.emptyTitle}>No personal ledgers yet</Text>
            <Text style={styles.emptyText}>When you add a payment or repayment, add the person’s name and their balance will appear here.</Text>
          </View>
        }
      />
      {selectedPerson ? <PersonDetail ledger={selectedPerson} onClose={() => setSelectedPerson(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  kicker: { color: palette.primary, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  title: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -0.8, marginTop: 5 },
  subtitle: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 300 },
  rule: { flexDirection: 'row', height: 3, marginTop: 22, gap: 5 },
  ruleAccent: { width: 42, backgroundColor: palette.primary, borderRadius: 2 },
  ruleRest: { flex: 1, backgroundColor: '#DDD9D0', borderRadius: 2 },
  personRow: { backgroundColor: palette.card, borderRadius: 19, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ECE8DE' },
  pressed: { opacity: 0.78 },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: palette.foreground, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarLarge: { width: 52, height: 52, borderRadius: 18, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFDF8', fontFamily: 'Inter_700Bold', fontSize: 17 },
  personMain: { flex: 1, minWidth: 0 },
  personName: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  personMeta: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  personBalance: { alignItems: 'flex-end', marginRight: 10 },
  personAmount: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  personDirection: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 3 },
  empty: { alignItems: 'center', paddingHorizontal: 30, paddingTop: 62 },
  emptyIcon: { width: 60, height: 60, borderRadius: 21, backgroundColor: '#F9DED7', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 16 },
  emptyText: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(25,51,47,0.38)' },
  modalDismiss: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  detailSheet: { maxHeight: '88%', backgroundColor: palette.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 11, paddingBottom: 22 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#C8C2B7', alignSelf: 'center', marginBottom: 19 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  detailHeaderText: { flex: 1, marginLeft: 12 },
  detailKicker: { color: palette.primary, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.3 },
  detailTitle: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.6, marginTop: 4 },
  closeButton: { width: 38, height: 38, backgroundColor: palette.card, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  balanceCard: { backgroundColor: palette.card, borderRadius: 19, borderWidth: 1, borderColor: '#ECE8DE', padding: 18, alignItems: 'center' },
  balanceLabel: { color: palette.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1 },
  balanceAmount: { fontFamily: 'Inter_700Bold', fontSize: 31, letterSpacing: -0.8, marginTop: 7 },
  balanceDirection: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 2 },
  detailStats: { flexDirection: 'row', paddingVertical: 18, alignItems: 'center' },
  detailStatLabel: { color: palette.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1 },
  detailStatValue: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14, marginTop: 5 },
  detailStatDivider: { width: 1, height: 25, backgroundColor: '#DDD9D0', marginHorizontal: 26 },
  historyLabel: { color: palette.primary, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.3, marginBottom: 10 },
  historyList: { paddingBottom: 8 },
  historyRow: { backgroundColor: palette.card, borderRadius: 16, borderWidth: 1, borderColor: '#ECE8DE', padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  historyIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  historyMain: { flex: 1, minWidth: 0 },
  historyTitle: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  historyMeta: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
  historyAmount: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  receivedAmount: { color: palette.primary },
});