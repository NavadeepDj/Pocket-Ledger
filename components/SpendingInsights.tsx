import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useExpenses } from '@/context/ExpenseContext';
import { spendingInsights } from '@/services/spendingInsights';
import colors from '@/constants/colors';

const p = colors.light;
const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export function SpendingInsights({ year, month }: { year: number; month: number }) {
  const { expenses } = useExpenses();
  const [selected, setSelected] = useState<string | null>(null);
  const today = new Date().toDateString();
  const data = useMemo(() => spendingInsights(expenses, year, month), [expenses, year, month, today]);
  const active = data.months.find(m => `${m.year}-${m.month}` === selected) ?? data.months[5];
  const max = Math.max(...data.months.map(m => m.amount), 1);
  return <View style={styles.card}>
    <Text style={styles.kicker}>SPENDING OVER TIME</Text>
    <View style={styles.row}>
      <View style={styles.metric}><Text style={styles.value}>{money(data.average)}</Text><Text style={styles.muted}>per calendar day{data.current ? ' so far' : ''}</Text></View>
      <View style={styles.metric}><Text style={styles.value}>{data.change === null ? '—' : `${Math.abs(data.change).toFixed(0)}% ${data.change > 0 ? 'higher' : data.change < 0 ? 'lower' : 'change'}`}</Text><Text style={styles.muted}>{data.change === null ? 'No prior spending to compare' : data.current ? `vs first ${data.comparisonDays} days last month` : 'vs previous full month'}</Text></View>
    </View>
    <Text style={styles.selection}>{active.label} {active.year}{active.partial ? ' so far' : ''} · {money(active.amount)}</Text>
    <View style={styles.chart}>
      {data.months.map(m => {
        const chosen = m === active;
        return <Pressable key={`${m.year}-${m.month}`} style={styles.column} accessibilityRole="button"
          accessibilityLabel={`${m.label} ${m.year}${m.partial ? ', month to date' : ''}, spent ${money(m.amount)}`}
          accessibilityState={{ selected: chosen }} onPress={() => setSelected(`${m.year}-${m.month}`)}>
          <View style={styles.track}><View style={[styles.bar, { height: m.amount ? Math.max(4, m.amount / max * 90) : 2, backgroundColor: chosen ? p.primary : p.foreground, opacity: chosen ? 1 : 0.35 }]} /></View>
          <Text style={[styles.muted, chosen && { color: p.foreground, fontFamily: 'Inter_700Bold' }]}>{m.label}</Text>
        </Pressable>;
      })}
    </View>
    <Text style={styles.footnote}>Tap a month to inspect. Paid entries only; current month is incomplete. Based on your saved ledger.</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: p.card, borderWidth: 1, borderColor: p.border, borderRadius: 20, padding: 18, marginBottom: 24, gap: 16 },
  kicker: { color: p.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2 },
  row: { flexDirection: 'row', gap: 14 }, metric: { flex: 1, gap: 5 },
  value: { color: p.foreground, fontFamily: 'Inter_700Bold', fontSize: 19 },
  muted: { color: p.mutedForeground, fontSize: 11, lineHeight: 16 },
  selection: { color: p.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  chart: { flexDirection: 'row', gap: 12 }, column: { flex: 1, alignItems: 'center', gap: 7 },
  track: { height: 90, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '75%', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  footnote: { color: p.mutedForeground, fontSize: 10, lineHeight: 15 },
});
