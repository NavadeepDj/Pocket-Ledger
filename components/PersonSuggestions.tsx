import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useExpenses } from '@/context/ExpenseContext';
import colors from '@/constants/colors';

const palette = colors.light;

export function PersonSuggestions({ value, onSelect }: { value: string; onSelect: (name: string) => void }) {
  const { expenses, personContacts } = useExpenses();
  const names = useMemo(() => {
    const unique = new Map<string, string>();
    for (const raw of [...expenses.map(e => e.person), ...Object.values(personContacts).map(c => c.name)]) {
      const name = raw.trim().replace(/\s+/g, ' ');
      if (name && !unique.has(name.toLocaleLowerCase())) unique.set(name.toLocaleLowerCase(), name);
    }
    return [...unique.values()];
  }, [expenses, personContacts]);
  const matches = names.filter(name => name.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()));
  if (!matches.length) return null;
  return <>
    <Text style={styles.hint}>Choose a saved person, or type a new name above</Text>
    <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
      {matches.map(name => <Pressable key={name} accessibilityRole="button" accessibilityLabel={`Select ${name}`}
        accessibilityState={{ selected: value.trim().toLocaleLowerCase() === name.toLocaleLowerCase() }}
        onPress={() => onSelect(name)} style={[styles.chip, value === name && styles.selected]}>
        <Text style={[styles.text, value === name && { color: palette.primaryForeground }]}>{name}</Text>
      </Pressable>)}
    </ScrollView>
  </>;
}

const styles = StyleSheet.create({
  hint: { color: palette.mutedForeground, fontSize: 11, marginBottom: 8 },
  list: { gap: 8, paddingBottom: 18 },
  chip: { backgroundColor: palette.card, borderColor: palette.input, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10 },
  selected: { backgroundColor: palette.primary, borderColor: palette.primary },
  text: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});
