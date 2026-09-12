import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import {
  CategoryItem,
  Expense,
  SubContextItem,
  useExpenses,
} from '@/context/ExpenseContext';

const palette = colors.light;

const PRESET_COLORS = [
  '#F06F58', '#7A8FE8', '#6366F1', '#E4A94F',
  '#A17BD8', '#56A887', '#E11D48', '#0EA5E9',
  '#D97706', '#10B981', '#8B5CF6', '#F59E0B',
];

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function DatePickerModal({
  visible,
  currentDate,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const [viewDate, setViewDate] = useState(new Date(currentDate));

  useEffect(() => {
    setViewDate(new Date(currentDate));
  }, [currentDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const monthName = viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={styles.pickerCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{monthName}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable onPress={prevMonth} style={styles.pickerNavBtn}>
                <Feather name="chevron-left" size={18} color={palette.foreground} />
              </Pressable>
              <Pressable onPress={nextMonth} style={styles.pickerNavBtn}>
                <Feather name="chevron-right" size={18} color={palette.foreground} />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekdaysRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <Text key={d} style={styles.weekdayText}>{d}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected =
                currentDate.getFullYear() === year &&
                currentDate.getMonth() === month &&
                currentDate.getDate() === dayNum;
              const isTodayDate =
                new Date().getFullYear() === year &&
                new Date().getMonth() === month &&
                new Date().getDate() === dayNum;

              return (
                <Pressable
                  key={`day-${dayNum}`}
                  onPress={() => {
                    const picked = new Date(year, month, dayNum);
                    onSelect(picked);
                    onClose();
                  }}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected, isTodayDate && !isSelected && styles.dayCellToday]}
                >
                  <Text style={[styles.dayCellText, isSelected && styles.dayCellTextSelected]}>
                    {dayNum}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AddCategoryModal({
  visible,
  onAdd,
  onClose,
}: {
  visible: boolean;
  onAdd: (cat: CategoryItem) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a category name');
      return;
    }
    onAdd({
      key: trimmed,
      label: trimmed,
      icon: 'tag',
      color: selectedColor,
    });
    setName('');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.pickerBackdrop}>
        <Pressable style={styles.customDialogCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetKicker}>CUSTOM CATEGORY</Text>
              <Text style={styles.customDialogTitle}>New category</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={18} color={palette.foreground} />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>CATEGORY NAME</Text>
          <TextInput
            value={name}
            onChangeText={(t) => { setName(t); setError(''); }}
            placeholder="e.g. Gaming, Subscriptions, Gifts"
            placeholderTextColor={palette.mutedForeground}
            style={styles.noteInput}
            autoFocus
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.fieldLabel}>CHOOSE COLOR</Text>
          <View style={styles.colorRow}>
            {PRESET_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setSelectedColor(c)}
                style={[styles.colorCircle, { backgroundColor: c }, selectedColor === c && styles.colorCircleSelected]}
              >
                {selectedColor === c && <Feather name="check" size={14} color="#FFF" />}
              </Pressable>
            ))}
          </View>

          <Pressable onPress={submit} style={styles.dialogSaveBtn}>
            <Text style={styles.dialogSaveBtnText}>Create category</Text>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddSubContextModal({
  visible,
  onAdd,
  onClose,
}: {
  visible: boolean;
  onAdd: (ctx: SubContextItem) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a context name');
      return;
    }
    onAdd({
      key: trimmed,
      label: trimmed,
      icon: 'folder',
    });
    setName('');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.pickerBackdrop}>
        <Pressable style={styles.customDialogCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetKicker}>CUSTOM SPHERE</Text>
              <Text style={styles.customDialogTitle}>New context</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={18} color={palette.foreground} />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>CONTEXT NAME</Text>
          <TextInput
            value={name}
            onChangeText={(t) => { setName(t); setError(''); }}
            placeholder="e.g. Freelance, College, Startup"
            placeholderTextColor={palette.mutedForeground}
            style={styles.noteInput}
            autoFocus
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable onPress={submit} style={styles.dialogSaveBtn}>
            <Text style={styles.dialogSaveBtnText}>Create context</Text>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export type EditExpenseModalProps = {
  expense: Expense | null;
  visible: boolean;
  onClose: () => void;
  existingEvents?: string[];
};

export function EditExpenseModal({
  expense,
  visible,
  onClose,
  existingEvents = [],
}: EditExpenseModalProps) {
  const insets = useSafeAreaInsets();
  const { updateExpense, deleteExpense, categories, subContexts, addCategory, addSubContext } = useExpenses();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('Food');
  const [direction, setDirection] = useState<'spent' | 'received'>('spent');
  const [person, setPerson] = useState('');
  const [subContext, setSubContext] = useState<string>('Personal');
  const [eventTag, setEventTag] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [showAddCtxModal, setShowAddCtxModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setNote(expense.note);
      setCategory(expense.category);
      setDirection(expense.direction);
      setPerson(expense.person);
      setSubContext(expense.subContext || 'Personal');
      setEventTag(expense.eventTag || '');
      setSelectedDate(expense.date ? new Date(expense.date) : new Date());
      setError('');
    }
  }, [expense]);

  if (!expense) return null;

  const isCurrentDay = isSameDay(selectedDate, new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterdayDay = isSameDay(selectedDate, yesterday);

  const save = async () => {
    const numericAmount = Number(amount.replace(',', '.'));
    if (!numericAmount || numericAmount <= 0) {
      setError('Enter an amount greater than zero');
      return;
    }
    await updateExpense({
      id: expense.id,
      amount: numericAmount,
      note: note.trim() || (direction === 'spent' ? 'Expense' : 'Money received'),
      category,
      direction,
      person: person.trim(),
      subContext,
      eventTag: eventTag.trim(),
      date: selectedDate.toISOString(),
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Keyboard.dismiss();
    onClose();
  };

  const confirmDelete = () => {
    const executeDelete = async () => {
      await deleteExpense(expense.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onClose();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this entry from your ledger?')) {
        void executeDelete();
      }
      return;
    }

    Alert.alert('Delete expense?', 'This entry will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void executeDelete() },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.modalBackdrop}>
        <Pressable style={styles.modalDismiss} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetKicker}>EDIT ENTRY</Text>
              <Text style={styles.sheetTitle}>Edit transaction</Text>
            </View>
            <Pressable testID="close-edit-expense" onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={20} color={palette.foreground} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetScroll}
          >
            {/* AMOUNT */}
            <Text style={styles.fieldLabel}>AMOUNT</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                testID="edit-expense-amount"
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

            {/* DATE */}
            <Text style={styles.fieldLabel}>DATE</Text>
            <View style={styles.dateRow}>
              <Pressable
                onPress={() => setSelectedDate(new Date())}
                style={[styles.dateChip, isCurrentDay && styles.dateChipSelected]}
              >
                <Feather name="calendar" size={13} color={isCurrentDay ? palette.primaryForeground : palette.foreground} />
                <Text style={[styles.dateChipText, isCurrentDay && styles.dateChipTextSelected]}>Today</Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedDate(yesterday)}
                style={[styles.dateChip, isYesterdayDay && styles.dateChipSelected]}
              >
                <Text style={[styles.dateChipText, isYesterdayDay && styles.dateChipTextSelected]}>Yesterday</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[styles.dateChip, !isCurrentDay && !isYesterdayDay && styles.dateChipSelected]}
              >
                <Feather
                  name="edit-3"
                  size={13}
                  color={!isCurrentDay && !isYesterdayDay ? palette.primaryForeground : palette.foreground}
                />
                <Text style={[styles.dateChipText, !isCurrentDay && !isYesterdayDay && styles.dateChipTextSelected]}>
                  {!isCurrentDay && !isYesterdayDay
                    ? selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Pick Date'}
                </Text>
              </Pressable>
            </View>

            {/* TRANSACTION TYPE */}
            <Text style={styles.fieldLabel}>TRANSACTION TYPE</Text>
            <View style={styles.flowToggle}>
              <Pressable
                testID="edit-direction-spent"
                onPress={() => setDirection('spent')}
                style={[styles.flowOption, direction === 'spent' && styles.flowOptionSelected]}
              >
                <Feather name="arrow-up-right" size={16} color={direction === 'spent' ? palette.primaryForeground : palette.primary} />
                <Text style={[styles.flowText, direction === 'spent' && styles.flowTextSelected]}>I paid</Text>
              </Pressable>
              <Pressable
                testID="edit-direction-received"
                onPress={() => setDirection('received')}
                style={[styles.flowOption, direction === 'received' && styles.flowOptionSelected]}
              >
                <Feather name="arrow-down-left" size={16} color={direction === 'received' ? palette.primaryForeground : palette.primary} />
                <Text style={[styles.flowText, direction === 'received' && styles.flowTextSelected]}>I received</Text>
              </Pressable>
            </View>

            {/* CONTEXT SPHERE */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.fieldLabel}>CONTEXT SPHERE</Text>
              <Pressable onPress={() => setShowAddCtxModal(true)} style={styles.addNewLabelBtn}>
                <Feather name="plus" size={12} color="#6366F1" />
                <Text style={styles.addNewLabelText}>Add Context</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.contextToggle}>
                {subContexts.map((item) => {
                  const selected = subContext === item.key;
                  return (
                    <Pressable
                      testID={`edit-context-${item.key}`}
                      key={item.key}
                      onPress={() => setSubContext(item.key)}
                      style={[styles.contextOption, selected && styles.contextOptionSelected]}
                    >
                      <Feather
                        name={(item.icon as keyof typeof Feather.glyphMap) || 'folder'}
                        size={13}
                        color={selected ? palette.primaryForeground : palette.foreground}
                      />
                      <Text style={[styles.contextText, selected && styles.contextTextSelected]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* EVENT TAG */}
            <View style={styles.eventInputBox}>
              <View style={styles.eventInputHeader}>
                <Feather name="calendar" size={13} color="#6366F1" />
                <Text style={styles.eventFieldLabel}>EVENT / TRIP TAG <Text style={styles.optional}>OPTIONAL</Text></Text>
              </View>
              <TextInput
                testID="edit-expense-event-tag"
                value={eventTag}
                onChangeText={setEventTag}
                placeholder="e.g. DevFest, Hackathon 2026"
                placeholderTextColor={palette.mutedForeground}
                style={styles.noteInput}
                autoCapitalize="words"
              />
              {existingEvents.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagChipsScroll} contentContainerStyle={styles.tagChipsContent}>
                  {existingEvents.map((tag) => (
                    <Pressable
                      key={tag}
                      onPress={() => setEventTag(tag)}
                      style={[styles.tagChip, eventTag === tag && styles.tagChipSelected]}
                    >
                      <Text style={[styles.tagChipText, eventTag === tag && styles.tagChipTextSelected]}>
                        #{tag}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>

            {/* CATEGORY */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <Pressable onPress={() => setShowAddCatModal(true)} style={styles.addNewLabelBtn}>
                <Feather name="plus" size={12} color="#6366F1" />
                <Text style={styles.addNewLabelText}>Add Category</Text>
              </Pressable>
            </View>
            <View style={styles.categoryGrid}>
              {categories.map((item) => {
                const selected = category === item.key;
                return (
                  <Pressable
                    testID={`edit-category-${item.key}`}
                    key={item.key}
                    onPress={() => setCategory(item.key)}
                    style={[styles.categoryOption, selected && { backgroundColor: item.color }]}
                  >
                    <Feather
                      name={(item.icon as keyof typeof Feather.glyphMap) || 'tag'}
                      size={15}
                      color={selected ? '#FFFDF8' : item.color}
                    />
                    <Text style={[styles.categoryOptionText, selected && styles.categoryOptionTextSelected]}>{item.label}</Text>
                  </Pressable>
                );
              })}
              <Pressable onPress={() => setShowAddCatModal(true)} style={styles.categoryAddOption}>
                <Feather name="plus" size={14} color={palette.primary} />
                <Text style={styles.categoryAddText}>New</Text>
              </Pressable>
            </View>

            {/* PERSON */}
            <Text style={styles.fieldLabel}>PERSON <Text style={styles.optional}>OPTIONAL</Text></Text>
            <TextInput
              testID="edit-expense-person"
              value={person}
              onChangeText={setPerson}
              placeholder="e.g. Rahul"
              placeholderTextColor={palette.mutedForeground}
              style={styles.noteInput}
              autoCapitalize="words"
            />

            {/* NOTE */}
            <Text style={styles.fieldLabel}>NOTE / DESCRIPTION <Text style={styles.optional}>OPTIONAL</Text></Text>
            <TextInput
              testID="edit-expense-note"
              value={note}
              onChangeText={setNote}
              placeholder="What was this for?"
              placeholderTextColor={palette.mutedForeground}
              style={styles.noteInput}
              returnKeyType="done"
              onSubmitEditing={() => void save()}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* SAVE BUTTON */}
            <Pressable
              testID="save-edit-expense"
              onPress={() => void save()}
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
            >
              <Feather name="check" size={19} color={palette.primaryForeground} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </Pressable>

            {/* DELETE ACTION */}
            <Pressable
              testID="delete-expense-action"
              onPress={confirmDelete}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            >
              <Feather name="trash-2" size={17} color={palette.destructive} />
              <Text style={styles.deleteButtonText}>Delete this expense</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showDatePicker}
        currentDate={selectedDate}
        onSelect={(d) => setSelectedDate(d)}
        onClose={() => setShowDatePicker(false)}
      />
      <AddCategoryModal
        visible={showAddCatModal}
        onAdd={(newCat) => {
          void addCategory(newCat);
          setCategory(newCat.key);
        }}
        onClose={() => setShowAddCatModal(false)}
      />
      <AddSubContextModal
        visible={showAddCtxModal}
        onAdd={(newCtx) => {
          void addSubContext(newCtx);
          setSubContext(newCtx.key);
        }}
        onClose={() => setShowAddCtxModal(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalDismiss: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(25,51,47,0.38)' },
  sheet: { backgroundColor: palette.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 11, maxHeight: '92%' },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#C8C2B7', alignSelf: 'center', marginBottom: 18 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetScroll: { paddingBottom: 24 },
  sheetKicker: { color: palette.primary, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  sheetTitle: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: -0.7, marginTop: 4 },
  closeButton: { width: 38, height: 38, backgroundColor: palette.card, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { color: palette.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, marginBottom: 8 },
  optional: { color: '#A4AAA4', fontFamily: 'Inter_500Medium', letterSpacing: 0.8 },
  amountInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderWidth: 1, borderColor: palette.input, borderRadius: 16, paddingHorizontal: 16, marginBottom: 14 },
  currencyPrefix: { color: palette.primary, fontFamily: 'Inter_700Bold', fontSize: 25, marginRight: 5 },
  amountInput: { flex: 1, color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 29, paddingVertical: 14 },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 11, backgroundColor: palette.card, borderWidth: 1, borderColor: '#ECE8DE' },
  dateChipSelected: { backgroundColor: palette.primary, borderColor: palette.primary },
  dateChipText: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  dateChipTextSelected: { color: palette.primaryForeground },
  flowToggle: { flexDirection: 'row', backgroundColor: palette.muted, borderRadius: 14, padding: 4, marginBottom: 16 },
  flowOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 11, paddingVertical: 11 },
  flowOptionSelected: { backgroundColor: palette.primary },
  flowText: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  flowTextSelected: { color: palette.primaryForeground },
  addNewLabelBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingBottom: 6 },
  addNewLabelText: { color: '#6366F1', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  contextToggle: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  contextOption: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: palette.card, borderWidth: 1, borderColor: '#ECE8DE' },
  contextOptionSelected: { backgroundColor: palette.primary, borderColor: palette.primary },
  contextText: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  contextTextSelected: { color: palette.primaryForeground },
  eventInputBox: { backgroundColor: '#F8F9FE', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E0E3FA', marginBottom: 16 },
  eventInputHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  eventFieldLabel: { color: '#4F46E5', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1 },
  tagChipsScroll: { marginTop: 4 },
  tagChipsContent: { flexDirection: 'row', gap: 6 },
  tagChip: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D7DAF8', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  tagChipSelected: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  tagChipText: { color: '#6366F1', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  tagChipTextSelected: { color: '#FFFFFF' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryOption: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: palette.card, borderWidth: 1, borderColor: '#E8E3D9' },
  categoryOptionText: { color: palette.foreground, fontFamily: 'Inter_500Medium', fontSize: 12, marginLeft: 6 },
  categoryOptionTextSelected: { color: '#FFFDF8', fontFamily: 'Inter_600SemiBold' },
  categoryAddOption: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: '#FAF8F4', borderWidth: 1, borderColor: '#D9D3C7', borderStyle: 'dashed', gap: 4 },
  categoryAddText: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  noteInput: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.input, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: palette.foreground, fontFamily: 'Inter_400Regular', fontSize: 14, marginBottom: 14 },
  errorText: { color: palette.destructive, fontFamily: 'Inter_500Medium', fontSize: 12, marginBottom: 9 },
  saveButton: { height: 52, borderRadius: 16, backgroundColor: palette.foreground, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 10 },
  saveButtonText: { color: '#FFFDF8', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  deleteButton: { height: 46, borderRadius: 14, backgroundColor: '#FEECEB', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, marginBottom: 16 },
  deleteButtonText: { color: palette.destructive, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  pressed: { opacity: 0.8 },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(25,51,47,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pickerCard: { width: '100%', maxWidth: 340, backgroundColor: palette.card, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 18, elevation: 8 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pickerTitle: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 16 },
  pickerNavBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: palette.muted, alignItems: 'center', justifyContent: 'center' },
  weekdaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekdayText: { width: 38, textAlign: 'center', color: palette.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, marginVertical: 2 },
  dayCellSelected: { backgroundColor: palette.primary },
  dayCellToday: { borderWidth: 1.5, borderColor: palette.primary },
  dayCellText: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  dayCellTextSelected: { color: palette.primaryForeground },
  customDialogCard: { width: '100%', maxWidth: 340, backgroundColor: palette.background, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, elevation: 9 },
  customDialogTitle: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5, marginTop: 2 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  colorCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorCircleSelected: { transform: [{ scale: 1.15 }], borderWidth: 2, borderColor: '#FFF' },
  dialogSaveBtn: { height: 48, borderRadius: 14, backgroundColor: palette.foreground, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  dialogSaveBtnText: { color: '#FFFDF8', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});

