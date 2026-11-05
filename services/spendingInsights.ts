import type { Expense } from '../context/ExpenseContext';

export function spendingInsights(expenses: Expense[], year: number, month: number, now = new Date()) {
  const current = year === now.getFullYear() && month === now.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const elapsed = current ? now.getDate() : days;
  const previousDays = new Date(year, month, 0).getDate();
  // Compare equal calendar-day windows, including February and year boundaries.
  const comparisonDays = current ? Math.min(elapsed, previousDays) : previousDays;
  const previousStart = new Date(year, month - 1, 1);
  const sum = (start: Date, through: number) => expenses.reduce((total, e) => {
    const date = new Date(e.date);
    return e.direction === 'spent' && date.getFullYear() === start.getFullYear() &&
      date.getMonth() === start.getMonth() && date.getDate() <= through ? total + e.amount : total;
  }, 0);
  const total = sum(new Date(year, month, 1), elapsed);
  const comparableTotal = sum(new Date(year, month, 1), current ? comparisonDays : days);
  const previous = sum(previousStart, comparisonDays);
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 5 + index, 1);
    const isCurrent = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    return { year: date.getFullYear(), month: date.getMonth(), label: date.toLocaleDateString('en-IN', { month: 'short' }),
      amount: sum(date, isCurrent ? now.getDate() : new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()), partial: isCurrent };
  });
  return { total, previous, comparisonDays, current, average: total / elapsed,
    change: previous > 0 ? (comparableTotal - previous) / previous * 100 : null, months };
}
