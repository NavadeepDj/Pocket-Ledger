import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { CATEGORIES, getCategory, useExpenses } from '@/context/ExpenseContext';
import colors from '@/constants/colors';

const palette = colors.light;
const currency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const compactCurrency = (amount: number) =>
  amount >= 1000 ? `₹${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k` : currency(amount);

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function DonutChart({ total, grouped }: { total: number; grouped: { category: string; amount: number }[] }) {
  const size = Math.min(Dimensions.get('window').width - 48, 228);
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={palette.muted}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {total > 0 &&
          grouped.map((item) => {
            const segment = (item.amount / total) * circumference;
            const node = (
              <Circle
                key={item.category}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={getCategory(item.category).color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${segment} ${circumference - segment}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
              />
            );
            offset += segment;
            return node;
          })}
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutEyebrow}>THIS MONTH</Text>
        <Text style={styles.donutTotal}>{compactCurrency(total)}</Text>
      </View>
    </View>
  );
}

function AddExpenseModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { addExpense } = useExpenses();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('Food');
  const [direction, setDirection] = useState<'spent' | 'received'>('spent');
  const [person, setPerson] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    const numericAmount = Number(amount.replace(',', '.'));
    if (!numericAmount || numericAmount <= 0) {
      setError('Enter an amount greater than zero');
      return;
    }
    await addExpense({ amount: numericAmount, note: note || (direction === 'spent' ? 'Expense' : 'Money received'), category, direction, person });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAmount('');
    setNote('');
    setCategory('Food');
    setDirection('spent');
    setPerson('');
    setError('');
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.modalBackdrop}>
        <Pressable style={styles.modalDismiss} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetKicker}>NEW ENTRY</Text>
              <Text style={styles.sheetTitle}>Add expense</Text>
            </View>
            <Pressable testID="close-expense" onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={20} color={palette.foreground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetScroll}>
            <Text style={styles.fieldLabel}>AMOUNT</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                testID="expense-amount"
                autoFocus
                value={amount}
                onChangeText={(value) => {
                  setAmount(value.replace(/[^0-9.,]/g, ''));
                  setError('');
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={palette.mutedForeground}
                style={styles.amountInput}
              />
            </View>

            <Text style={styles.fieldLabel}>TRANSACTION TYPE</Text>
            <View style={styles.flowToggle}>
              <Pressable testID="direction-spent" onPress={() => setDirection('spent')} style={[styles.flowOption, direction === 'spent' && styles.flowOptionSelected]}>
                <Feather name="arrow-up-right" size={16} color={direction === 'spent' ? palette.primaryForeground : palette.primary} />
                <Text style={[styles.flowText, direction === 'spent' && styles.flowTextSelected]}>I paid</Text>
              </Pressable>
              <Pressable testID="direction-received" onPress={() => setDirection('received')} style={[styles.flowOption, direction === 'received' && styles.flowOptionSelected]}>
                <Feather name="arrow-down-left" size={16} color={direction === 'received' ? palette.primaryForeground : palette.primary} />
                <Text style={[styles.flowText, direction === 'received' && styles.flowTextSelected]}>I received</Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>PERSON <Text style={styles.optional}>OPTIONAL</Text></Text>
            <TextInput
              testID="expense-person"
              value={person}
              onChangeText={setPerson}
              placeholder="e.g. Anjana"
              placeholderTextColor={palette.mutedForeground}
              style={styles.noteInput}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((item) => {
                const selected = category === item.key;
                return (
                  <Pressable
                    testID={`category-${item.key}`}
                    key={item.key}
                    onPress={() => setCategory(item.key)}
                    style={[styles.categoryOption, selected && { backgroundColor: item.color }]}
                  >
                    <Feather name={item.icon as keyof typeof Feather.glyphMap} size={16} color={selected ? '#FFFDF8' : item.color} />
                    <Text style={[styles.categoryOptionText, selected && styles.categoryOptionTextSelected]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>NOTE <Text style={styles.optional}>OPTIONAL</Text></Text>
            <TextInput
              testID="expense-note"
              value={note}
              onChangeText={setNote}
              placeholder="What was this for?"
              placeholderTextColor={palette.mutedForeground}
              style={styles.noteInput}
              returnKeyType="done"
              onSubmitEditing={() => void save()}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable testID="save-expense" onPress={() => void save()} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
              <Feather name="plus" size={19} color={palette.primaryForeground} />
              <Text style={styles.saveButtonText}>{direction === 'spent' ? 'Save expense' : 'Save transaction'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { expenses, loading } = useExpenses();
  const [modalVisible, setModalVisible] = useState(false);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthExpenses = expenses.filter((expense) => {
    const date = new Date(expense.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const monthSpent = monthExpenses.filter((expense) => expense.direction === 'spent');
  const total = monthSpent.reduce((sum, expense) => sum + expense.amount, 0);
  const todayTotal = monthSpent
    .filter((expense) => new Date(expense.date).toDateString() === new Date().toDateString())
    .reduce((sum, expense) => sum + expense.amount, 0);
  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    monthSpent.forEach((expense) => map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount));
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthSpent]);
  const recent = expenses.slice(0, 4);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) + 96 }]}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brand}>Pocket <Text style={styles.brandAccent}>Ledger</Text></Text>
            <Text style={styles.greeting}>Your money, in focus.</Text>
          </View>
          <Pressable testID="add-expense-header" onPress={() => setModalVisible(true)} style={({ pressed }) => [styles.headerAdd, pressed && styles.pressed]}>
            <Feather name="plus" size={20} color={palette.primaryForeground} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>SPENT THIS MONTH</Text>
            <View style={styles.monthPill}><Text style={styles.monthPillText}>{new Date().toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</Text></View>
          </View>
          {loading ? <ActivityIndicator color={palette.primaryForeground} /> : <Text style={styles.heroTotal}>{currency(total)}</Text>}
          <View style={styles.heroRule} />
          <View style={styles.heroMeta}>
            <View><Text style={styles.heroMetaLabel}>TODAY</Text><Text style={styles.heroMetaValue}>{currency(todayTotal)}</Text></View>
            <View style={styles.heroMetaDivider} />
            <View><Text style={styles.heroMetaLabel}>ENTRIES</Text><Text style={styles.heroMetaValue}>{monthExpenses.length}</Text></View>
            <View style={styles.heroSpark}><Feather name="trending-up" size={22} color={palette.primaryForeground} /><Text style={styles.sparkText}>STAY AWARE</Text></View>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View><Text style={styles.sectionKicker}>YOUR BREAKDOWN</Text><Text style={styles.sectionTitle}>Where it goes</Text></View>
          <Text style={styles.sectionTotal}>{compactCurrency(total)}</Text>
        </View>
        <View style={styles.breakdownCard}>
          <DonutChart total={total} grouped={grouped} />
          {grouped.length > 0 ? (
            <View style={styles.legend}>
              {grouped.slice(0, 4).map((item) => (
                <View key={item.category} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: getCategory(item.category).color }]} />
                  <Text style={styles.legendLabel}>{item.category}</Text>
                  <Text style={styles.legendAmount}>{currency(item.amount)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Feather name="pie-chart" size={20} color={palette.primary} />
              <Text style={styles.emptyChartTitle}>Your story starts here</Text>
              <Text style={styles.emptyChartText}>Add an expense to see your spending shape up.</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeading}>
          <View><Text style={styles.sectionKicker}>RECENT ACTIVITY</Text><Text style={styles.sectionTitle}>Latest expenses</Text></View>
          <Text style={styles.sectionCount}>{expenses.length}</Text>
        </View>
        <View style={styles.recentCard}>
          {recent.length > 0 ? recent.map((expense, index) => {
            const meta = getCategory(expense.category);
            return (
              <View key={expense.id} style={[styles.expenseRow, index < recent.length - 1 && styles.expenseRowBorder]}>
                <View style={[styles.expenseIcon, { backgroundColor: `${meta.color}1C` }]}><Feather name={expense.direction === 'received' ? 'arrow-down-left' : meta.icon as keyof typeof Feather.glyphMap} size={18} color={expense.direction === 'received' ? palette.foreground : meta.color} /></View>
                <View style={styles.expenseMain}><Text style={styles.expenseNote} numberOfLines={1}>{expense.note || expense.category}</Text><Text style={styles.expenseMeta}>{expense.person ? `${expense.person} · ` : ''}{expense.category} · {formatDate(expense.date)}</Text></View>
                <Text style={[styles.expenseAmount, expense.direction === 'received' && styles.receivedAmount]}>{expense.direction === 'received' ? '+' : '−'}{currency(expense.amount)}</Text>
              </View>
            );
          }) : (
            <View style={styles.emptyRecent}>
              <Text style={styles.emptyRecentTitle}>Nothing logged yet</Text>
              <Text style={styles.emptyRecentText}>Your latest expenses will appear here.</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <Pressable testID="add-expense-fab" onPress={() => setModalVisible(true)} style={({ pressed }) => [styles.fab, { bottom: Math.max(insets.bottom, 18) + 74 }, pressed && styles.pressed]}>
        <Feather name="plus" size={22} color={palette.primaryForeground} />
        <Text style={styles.fabText}>Add expense</Text>
      </Pressable>
      <AddExpenseModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  scrollContent: { paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  brand: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.8 },
  brandAccent: { color: palette.primary },
  greeting: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 3 },
  headerAdd: { width: 44, height: 44, backgroundColor: palette.foreground, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  heroCard: { backgroundColor: palette.foreground, borderRadius: 24, padding: 22, marginBottom: 30 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: '#B5C9BF', fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.2 },
  monthPill: { backgroundColor: '#315149', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  monthPillText: { color: '#D6E8DD', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1 },
  heroTotal: { color: '#FFFDF8', fontFamily: 'Inter_700Bold', fontSize: 42, letterSpacing: -1.8, marginTop: 12 },
  heroRule: { height: 1, backgroundColor: '#36564D', marginVertical: 18 },
  heroMeta: { flexDirection: 'row', alignItems: 'center' },
  heroMetaLabel: { color: '#94B1A5', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1 },
  heroMetaValue: { color: '#FFFDF8', fontFamily: 'Inter_600SemiBold', fontSize: 15, marginTop: 4 },
  heroMetaDivider: { height: 26, width: 1, backgroundColor: '#36564D', marginHorizontal: 23 },
  heroSpark: { marginLeft: 'auto', alignItems: 'flex-end', gap: 2 },
  sparkText: { color: '#94B1A5', fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 0.6 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 13 },
  sectionKicker: { color: palette.primary, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  sectionTitle: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5, marginTop: 4 },
  sectionTotal: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14, paddingBottom: 3 },
  sectionCount: { color: palette.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 14, paddingBottom: 3 },
  breakdownCard: { backgroundColor: palette.card, borderRadius: 22, padding: 18, marginBottom: 30, borderWidth: 1, borderColor: '#ECE8DE' },
  donutWrap: { alignItems: 'center', justifyContent: 'center', marginVertical: 3 },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutEyebrow: { color: palette.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1.1 },
  donutTotal: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.8, marginTop: 4 },
  legend: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#ECE8DE', paddingTop: 12, gap: 11 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 9 },
  legendLabel: { color: palette.foreground, fontFamily: 'Inter_500Medium', fontSize: 13, flex: 1 },
  legendAmount: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  emptyChart: { alignItems: 'center', borderTopWidth: 1, borderTopColor: '#ECE8DE', marginTop: 12, paddingTop: 14 },
  emptyChartTitle: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14, marginTop: 8 },
  emptyChartText: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', marginTop: 4 },
  recentCard: { backgroundColor: palette.card, borderRadius: 22, paddingHorizontal: 16, borderWidth: 1, borderColor: '#ECE8DE', marginBottom: 8 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  expenseRowBorder: { borderBottomWidth: 1, borderBottomColor: '#ECE8DE' },
  expenseIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  expenseMain: { flex: 1, minWidth: 0 },
  expenseNote: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  expenseMeta: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  expenseAmount: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14, marginLeft: 10 },
  receivedAmount: { color: palette.primary },
  emptyRecent: { paddingVertical: 24, alignItems: 'center' },
  emptyRecentTitle: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  emptyRecentText: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  fab: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: palette.primary, paddingHorizontal: 18, height: 52, borderRadius: 18, shadowColor: '#19332F', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 6 },
  fabText: { color: palette.primaryForeground, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  pressed: { opacity: 0.82 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalDismiss: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(25,51,47,0.38)' },
  sheet: { backgroundColor: palette.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 11 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#C8C2B7', alignSelf: 'center', marginBottom: 18 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sheetScroll: { paddingBottom: 2 },
  sheetKicker: { color: palette.primary, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  sheetTitle: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: -0.7, marginTop: 4 },
  closeButton: { width: 38, height: 38, backgroundColor: palette.card, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { color: palette.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, marginBottom: 8 },
  optional: { color: '#A4AAA4', fontFamily: 'Inter_500Medium', letterSpacing: 0.8 },
  amountInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderWidth: 1, borderColor: palette.input, borderRadius: 16, paddingHorizontal: 16, marginBottom: 20 },
  currencyPrefix: { color: palette.primary, fontFamily: 'Inter_700Bold', fontSize: 25, marginRight: 5 },
  amountInput: { flex: 1, color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 29, paddingVertical: 14 },
  flowToggle: { flexDirection: 'row', backgroundColor: palette.muted, borderRadius: 14, padding: 4, marginBottom: 20 },
  flowOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 11, paddingVertical: 11 },
  flowOptionSelected: { backgroundColor: palette.primary },
  flowText: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  flowTextSelected: { color: palette.primaryForeground },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  categoryOption: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: palette.card, borderWidth: 1, borderColor: '#E8E3D9' },
  categoryOptionText: { color: palette.foreground, fontFamily: 'Inter_500Medium', fontSize: 12, marginLeft: 6 },
  categoryOptionTextSelected: { color: '#FFFDF8', fontFamily: 'Inter_600SemiBold' },
  noteInput: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.input, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: palette.foreground, fontFamily: 'Inter_400Regular', fontSize: 14, marginBottom: 9 },
  errorText: { color: palette.destructive, fontFamily: 'Inter_500Medium', fontSize: 12, marginBottom: 9 },
  saveButton: { height: 52, borderRadius: 16, backgroundColor: palette.foreground, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 8 },
  saveButtonText: { color: '#FFFDF8', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});