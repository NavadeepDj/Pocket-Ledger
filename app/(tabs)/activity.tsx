import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import { Expense, getCategory, SubContext, useExpenses } from '@/context/ExpenseContext';

const palette = colors.light;
const currency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ExpenseItem({
  expense,
  onDelete,
  onSelectEvent,
}: {
  expense: Expense;
  onDelete: () => void;
  onSelectEvent: (event: string) => void;
}) {
  const category = getCategory(expense.category);
  const remove = () => {
    if (Platform.OS === 'web') {
      onDelete();
      return;
    }
    Alert.alert('Delete expense?', 'This entry will be removed from your ledger.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <Pressable testID={`expense-${expense.id}`} onLongPress={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).then(remove)} style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
      <View style={[styles.icon, { backgroundColor: `${category.color}1C` }]}>
        <Feather name={category.icon as keyof typeof Feather.glyphMap} size={19} color={category.color} />
      </View>
      <View style={styles.itemMain}>
        <Text style={styles.note} numberOfLines={1}>{expense.note || expense.category}</Text>
        <View style={styles.badgeRow}>
          <Text style={styles.meta}>
            {expense.person ? `${expense.person} · ` : ''}{expense.direction === 'received' ? 'Received' : expense.category} · {formatDate(expense.date)}
          </Text>
          <View style={[styles.contextBadge, expense.subContext === 'Developer' && styles.contextBadgeDev]}>
            <Text style={[styles.contextBadgeText, expense.subContext === 'Developer' && styles.contextBadgeTextDev]}>
              {expense.subContext}
            </Text>
          </View>
          {expense.eventTag ? (
            <Pressable onPress={() => onSelectEvent(expense.eventTag)} hitSlop={6} style={styles.eventBadge}>
              <Text style={styles.eventBadgeText}>#{expense.eventTag}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={styles.amountWrap}>
        <Text style={[styles.amount, expense.direction === 'received' && styles.receivedAmount]}>
          {expense.direction === 'received' ? '+' : '−'}{currency(expense.amount)}
        </Text>
        <Pressable testID={`delete-${expense.id}`} onPress={remove} hitSlop={10} style={styles.deleteButton}>
          <Feather name="more-horizontal" size={18} color={palette.mutedForeground} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { expenses, loading, reload, deleteExpense } = useExpenses();
  const [filterContext, setFilterContext] = useState<SubContext | 'All'>('All');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      if (filterContext !== 'All' && item.subContext !== filterContext) return false;
      if (selectedEvent && item.eventTag.trim().toLowerCase() !== selectedEvent.trim().toLowerCase()) return false;
      return true;
    });
  }, [expenses, filterContext, selectedEvent]);

  const total = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExpenseItem
            expense={item}
            onDelete={() => void deleteExpense(item.id)}
            onSelectEvent={(tag) => setSelectedEvent(tag)}
          />
        )}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) + 84 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filteredExpenses.length > 0}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} tintColor={palette.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.kicker}>YOUR LEDGER</Text>
            <Text style={styles.title}>All activity</Text>

            {/* SUMMARY CARD */}
            <View style={styles.summary}>
              <View>
                <Text style={styles.summaryLabel}>
                  {selectedEvent ? `TOTAL FOR #${selectedEvent.toUpperCase()}` : filterContext !== 'All' ? `TOTAL FOR ${filterContext.toUpperCase()}` : 'TOTAL TRACKED'}
                </Text>
                <Text style={styles.summaryAmount}>{currency(total)}</Text>
              </View>
              <View style={styles.summaryIcon}>
                <Feather name="archive" size={20} color={palette.primaryForeground} />
              </View>
            </View>

            {/* FILTER PILLS */}
            <View style={styles.filterPills}>
              {(['All', 'Personal', 'Developer', 'Office'] as const).map((ctx) => {
                const active = filterContext === ctx;
                return (
                  <Pressable
                    key={ctx}
                    onPress={() => setFilterContext(ctx)}
                    style={[styles.filterPill, active && styles.filterPillActive]}
                  >
                    <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                      {ctx}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ACTIVE EVENT TAG CHIP */}
            {selectedEvent && (
              <View style={styles.activeEventFilterRow}>
                <Text style={styles.activeEventFilterLabel}>Event filter:</Text>
                <View style={styles.activeEventTagChip}>
                  <Text style={styles.activeEventTagText}>#{selectedEvent}</Text>
                  <Pressable onPress={() => setSelectedEvent(null)} hitSlop={6} style={styles.activeEventTagClose}>
                    <Feather name="x" size={13} color="#4F46E5" />
                  </Pressable>
                </View>
              </View>
            )}

            {filteredExpenses.length > 0 ? (
              <Text style={styles.hint}>Amounts in coral are money received</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Feather name="inbox" size={24} color={palette.primary} /></View>
            <Text style={styles.emptyTitle}>
              {selectedEvent || filterContext !== 'All' ? 'No matching expenses' : 'Your ledger is clear'}
            </Text>
            <Text style={styles.emptyText}>
              {selectedEvent || filterContext !== 'All'
                ? 'Try changing or clearing your filters above.'
                : 'Expenses you add from Home will land here, ready to review.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { paddingHorizontal: 20 },
  header: { marginBottom: 18 },
  kicker: { color: palette.primary, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  title: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -0.8, marginTop: 5 },
  summary: { backgroundColor: palette.foreground, borderRadius: 22, padding: 20, marginTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#94B1A5', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.1 },
  summaryAmount: { color: '#FFFDF8', fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -1, marginTop: 7 },
  summaryIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  filterPills: { flexDirection: 'row', gap: 7, marginTop: 16 },
  filterPill: { flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: palette.card, borderWidth: 1, borderColor: '#ECE8DE' },
  filterPillActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  filterPillText: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  filterPillTextActive: { color: palette.primaryForeground },
  activeEventFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: '#EEF0FD', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  activeEventFilterLabel: { color: '#4F46E5', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  activeEventTagChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#C7D2FE' },
  activeEventTagText: { color: '#4F46E5', fontFamily: 'Inter_700Bold', fontSize: 12 },
  activeEventTagClose: { padding: 2 },
  hint: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 12 },
  item: { backgroundColor: palette.card, borderRadius: 18, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ECE8DE' },
  itemPressed: { opacity: 0.78 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemMain: { flex: 1, minWidth: 0 },
  note: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  meta: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11 },
  contextBadge: { backgroundColor: '#ECE8DE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  contextBadgeDev: { backgroundColor: '#ECEEFE' },
  contextBadgeText: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  contextBadgeTextDev: { color: '#6366F1' },
  eventBadge: { backgroundColor: '#EBF6F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  eventBadgeText: { color: '#1B6A4B', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  amountWrap: { alignItems: 'flex-end', marginLeft: 10 },
  amount: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  receivedAmount: { color: palette.primary },
  deleteButton: { marginTop: 3 },
  empty: { alignItems: 'center', paddingHorizontal: 30, paddingTop: 55 },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#F9DED7', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 16 },
  emptyText: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
});