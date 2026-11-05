import { spendingInsights } from '../spendingInsights';
import type { Expense } from '../../context/ExpenseContext';

function assert(value: unknown, message: string) { if (!value) throw new Error(message); }
function entry(year: number, month: number, day: number, amount: number, direction: Expense['direction'] = 'spent'): Expense {
  return { id: `${year}-${month}-${day}-${direction}`, date: new Date(year, month, day, 12).toISOString(), amount, direction,
    person: '', category: 'Other', subContext: 'Personal', eventTag: '', note: '' };
}
const now = new Date(2026, 10, 5, 15);
const data = [entry(2026, 10, 1, 100), entry(2026, 10, 5, 50), entry(2026, 10, 6, 999),
  entry(2026, 10, 2, 2000, 'received'), entry(2026, 9, 2, 300), entry(2026, 9, 20, 700)];
const current = spendingInsights(data, 2026, 10, now);
assert(current.total === 150 && current.average === 30, 'Use elapsed calendar days; exclude receipts and future dates');
assert(current.previous === 300 && current.change === -50, 'Compare the same elapsed window, not a full previous month');
assert(current.months[5].amount === 150 && current.months[5].partial, 'Label incomplete current-month bars');
const historical = spendingInsights(data, 2026, 9, now);
assert(historical.total === 1000 && !historical.current, 'Past months use all days');
assert(historical.change === null, 'No invented percentage when the comparison baseline is zero');
const january = spendingInsights([entry(2025, 11, 2, 100), entry(2026, 0, 2, 200)], 2026, 0, new Date(2026, 0, 5));
assert(january.previous === 100 && january.change === 100, 'Comparison crosses year boundaries');
const march = spendingInsights([entry(2026, 1, 28, 100), entry(2026, 2, 28, 100), entry(2026, 2, 30, 200)], 2026, 2, new Date(2026, 2, 31));
assert(march.comparisonDays === 28 && march.change === 0 && march.total === 300, 'Unequal month lengths use equal-day comparison without losing the full total');
assert(spendingInsights([], 2026, 10, now).average === 0, 'Empty ledger has finite zero statistics');
console.log('Spending insight tests passed: elapsed periods, receipts, future dates, zero baseline, year boundaries and unequal months.');
