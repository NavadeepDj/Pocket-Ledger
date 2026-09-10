import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export type SubContext = 'Personal' | 'Developer' | 'Office';

export const SUB_CONTEXTS: { key: SubContext; label: string; icon: string }[] = [
  { key: 'Personal', label: 'Personal', icon: 'user' },
  { key: 'Developer', label: 'Developer', icon: 'code' },
  { key: 'Office', label: 'Office', icon: 'briefcase' },
];

export type Expense = {
  id: string;
  amount: number;
  category: string;
  subContext: SubContext;
  eventTag: string;
  note: string;
  date: string;
  direction: 'spent' | 'received';
  person: string;
};

export const CATEGORIES = [
  { key: 'Food', label: 'Food', icon: 'coffee', color: '#F06F58' },
  { key: 'Transport', label: 'Transport', icon: 'navigation', color: '#7A8FE8' },
  { key: 'Developer', label: 'Developer', icon: 'terminal', color: '#6366F1' },
  { key: 'Home', label: 'Home', icon: 'home', color: '#E4A94F' },
  { key: 'Shopping', label: 'Shopping', icon: 'shopping-bag', color: '#A17BD8' },
  { key: 'Health', label: 'Health', icon: 'heart', color: '#56A887' },
  { key: 'Other', label: 'Other', icon: 'more-horizontal', color: '#83908B' },
] as const;

const STORAGE_KEY = '@pocket-ledger/expenses';
type Database = ReturnType<typeof SQLite.openDatabaseSync>;
let database: Database | null = null;

function getDatabase() {
  if (Platform.OS === 'web') return null;
  if (!database) {
    database = SQLite.openDatabaseSync('pocket-ledger.db');
    database.execSync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        note TEXT NOT NULL,
        date TEXT NOT NULL,
        direction TEXT NOT NULL DEFAULT 'spent',
        person TEXT NOT NULL DEFAULT '',
        sub_context TEXT NOT NULL DEFAULT 'Personal',
        event_tag TEXT NOT NULL DEFAULT ''
      );
    `);
    try {
      database.execSync("ALTER TABLE expenses ADD COLUMN direction TEXT NOT NULL DEFAULT 'spent'");
    } catch {
      // The column already exists on upgraded databases.
    }
    try {
      database.execSync("ALTER TABLE expenses ADD COLUMN person TEXT NOT NULL DEFAULT ''");
    } catch {
      // The column already exists on upgraded databases.
    }
    try {
      database.execSync("ALTER TABLE expenses ADD COLUMN sub_context TEXT NOT NULL DEFAULT 'Personal'");
    } catch {
      // The column already exists on upgraded databases.
    }
    try {
      database.execSync("ALTER TABLE expenses ADD COLUMN event_tag TEXT NOT NULL DEFAULT ''");
    } catch {
      // The column already exists on upgraded databases.
    }
  }
  return database;
}

type DbExpenseRow = {
  id: string;
  amount: number | string;
  category: string;
  note: string;
  date: string;
  direction?: 'spent' | 'received';
  person?: string;
  sub_context?: SubContext;
  event_tag?: string;
};

async function readExpenses(): Promise<Expense[]> {
  const db = getDatabase();
  if (db) {
    return db
      .getAllSync<DbExpenseRow>('SELECT id, amount, category, note, date, direction, person, sub_context, event_tag FROM expenses ORDER BY date DESC')
      .map((item) => ({
        id: item.id,
        amount: Number(item.amount),
        category: item.category,
        note: item.note,
        date: item.date,
        direction: item.direction ?? 'spent',
        person: item.person ?? '',
        subContext: (item.sub_context as SubContext) || 'Personal',
        eventTag: item.event_tag ?? '',
      }));
  }

  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return stored
    ? (JSON.parse(stored) as Partial<Expense>[]).map((item) => ({
        id: item.id ?? '',
        amount: Number(item.amount ?? 0),
        category: item.category ?? 'Other',
        subContext: (item.subContext as SubContext) || 'Personal',
        eventTag: item.eventTag ?? '',
        note: item.note ?? 'Expense',
        date: item.date ?? new Date().toISOString(),
        direction: item.direction ?? 'spent',
        person: item.person ?? '',
      }))
    : [];
}

async function writeWebExpenses(expenses: Expense[]) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }
}

export type AddExpenseInput = {
  amount: number;
  category: string;
  note: string;
  direction: 'spent' | 'received';
  person: string;
  subContext?: SubContext;
  eventTag?: string;
  date?: string;
};

type ExpenseContextValue = {
  expenses: Expense[];
  loading: boolean;
  addExpense: (input: AddExpenseInput) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setExpenses(await readExpenses());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addExpense = useCallback(async (input: AddExpenseInput) => {
    const expense: Expense = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      amount: Number(input.amount),
      category: input.category,
      subContext: input.subContext ?? 'Personal',
      eventTag: (input.eventTag ?? '').trim(),
      note: input.note.trim(),
      date: input.date ?? new Date().toISOString(),
      direction: input.direction,
      person: input.person.trim(),
    };
    const db = getDatabase();
    if (db) {
      db.runSync(
        'INSERT INTO expenses (id, amount, category, note, date, direction, person, sub_context, event_tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        expense.id,
        expense.amount,
        expense.category,
        expense.note,
        expense.date,
        expense.direction,
        expense.person,
        expense.subContext,
        expense.eventTag,
      );
    }
    setExpenses((current) => [expense, ...current]);
    await writeWebExpenses([expense, ...expenses]);
  }, [expenses]);

  const deleteExpense = useCallback(async (id: string) => {
    const db = getDatabase();
    if (db) db.runSync('DELETE FROM expenses WHERE id = ?', id);
    const next = expenses.filter((expense) => expense.id !== id);
    setExpenses(next);
    await writeWebExpenses(next);
  }, [expenses]);

  const value = useMemo(
    () => ({ expenses, loading, addExpense, deleteExpense, reload }),
    [expenses, loading, addExpense, deleteExpense, reload],
  );

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
}

export function useExpenses() {
  const value = useContext(ExpenseContext);
  if (!value) throw new Error('useExpenses must be used within ExpenseProvider');
  return value;
}

export function getCategory(category: string) {
  return CATEGORIES.find((item) => item.key === category) ?? CATEGORIES[CATEGORIES.length - 1];
}