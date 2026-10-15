import type { AppData, Book, Category, Goal, MonthSnapshot, Transaction } from '../types'
import { parseDeadline } from '../utils/date'

export interface MonthFigures {
  month: string
  income: number
  expense: number
  balance: number
  byCategory: Record<string, number>
  hasData: boolean
  fromSnapshot: boolean
  liveCount: number
  snapshotIncome: number
  snapshotExpense: number
}

export interface YearFigures {
  year: number
  months: MonthFigures[]
  income: number
  expense: number
  balance: number
  byCategory: Record<string, number>
  best: MonthFigures | null
  worst: MonthFigures | null
}

export interface CategoryTotal {
  id: string
  name: string
  amount: number
}

export interface BudgetRow {
  id: string
  name: string
  spent: number
  limit: number
}

export interface PlanProgress {
  plan: AppData['plans'][number] | null
  figures: MonthFigures
  rows: BudgetRow[]
  target: number
  budgetLimit: number
  budgetSpent: number
  budgetRemaining: number
}

export interface GoalPace {
  expected: number
  actual: number
  overdue: boolean
}

export interface GoalSummary {
  activeCount: number
  target: number
  saved: number
  ratio: number
}

export interface MonthAllocation {
  allocated: number
  balance: number
  remaining: number
}

export interface ReadingStats {
  year: number
  finishedCount: number
  pages: number
  saved: number
}

export function monthOf(date: string): string {
  return date.slice(0, 7)
}

export function accumulateMonth(
  existing: MonthSnapshot | undefined,
  transactions: Transaction[],
  month: string,
): MonthSnapshot {
  const byCategory: Record<string, number> = { ...(existing?.byCategory ?? {}) }
  let income = existing?.income ?? 0
  let expense = existing?.expense ?? 0
  for (const tx of transactions) {
    if (monthOf(tx.date) !== month) continue
    if (tx.type === 'income') income += tx.amount
    else expense += tx.amount
    byCategory[tx.categoryId] = (byCategory[tx.categoryId] ?? 0) + tx.amount
  }
  return { month, income, expense, byCategory }
}

export function getMonthFigures(data: AppData, month: string): MonthFigures {
  const snapshot = data.snapshots.find((item) => item.month === month)
  const live = data.transactions.filter((item) => monthOf(item.date) === month)
  const totals = accumulateMonth(snapshot, live, month)
  return {
    ...totals,
    balance: totals.income - totals.expense,
    hasData: Boolean(snapshot) || live.length > 0,
    fromSnapshot: Boolean(snapshot),
    liveCount: live.length,
    snapshotIncome: snapshot?.income ?? 0,
    snapshotExpense: snapshot?.expense ?? 0,
  }
}

export function getYearFigures(data: AppData, year: number): YearFigures {
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`
    return getMonthFigures(data, month)
  })
  const income = months.reduce((sum, month) => sum + month.income, 0)
  const expense = months.reduce((sum, month) => sum + month.expense, 0)
  const byCategory: Record<string, number> = {}
  for (const month of months) {
    for (const [id, amount] of Object.entries(month.byCategory)) {
      byCategory[id] = (byCategory[id] ?? 0) + amount
    }
  }
  const ranked = months.filter((month) => month.hasData)
  const best = ranked.reduce<MonthFigures | null>((pick, month) => {
    if (!pick || month.balance > pick.balance) return month
    return pick
  }, null)
  const worst = ranked.reduce<MonthFigures | null>((pick, month) => {
    if (!pick || month.balance < pick.balance) return month
    return pick
  }, null)
  return {
    year,
    months,
    income,
    expense,
    balance: income - expense,
    byCategory,
    best,
    worst,
  }
}

export function categoryName(categories: Category[], id: string): string {
  return categories.find((item) => item.id === id)?.name ?? '未分类'
}

export function expenseBreakdown(data: AppData, byCategory: Record<string, number>): CategoryTotal[] {
  return Object.entries(byCategory)
    .filter(([, amount]) => amount > 0)
    .filter(([id]) => data.categories.find((item) => item.id === id)?.type !== 'income')
    .map(([id, amount]) => ({
      id,
      name: categoryName(data.categories, id),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function getPlanProgress(data: AppData, month: string): PlanProgress {
  const year = Number(month.slice(0, 4))
  const plan = data.plans.find((item) => item.year === year) ?? null
  const figures = getMonthFigures(data, month)
  const rows = data.categories
    .filter((item) => item.type === 'expense')
    .map((item) => ({
      id: item.id,
      name: item.name,
      spent: figures.byCategory[item.id] ?? 0,
      limit: plan?.categoryBudgets.find((budget) => budget.categoryId === item.id)?.limit ?? 0,
    }))
  const budgeted = rows.filter((row) => row.limit > 0)
  const budgetLimit = budgeted.reduce((sum, row) => sum + row.limit, 0)
  const budgetSpent = budgeted.reduce((sum, row) => sum + row.spent, 0)
  return {
    plan,
    figures,
    rows,
    target: plan?.monthlySaveTarget ?? 0,
    budgetLimit,
    budgetSpent,
    budgetRemaining: budgetLimit - budgetSpent,
  }
}

export function goalPace(goal: Goal, now = new Date()): GoalPace | null {
  if (goal.targetAmount <= 0) return null
  const end = parseDeadline(goal.deadline)
  if (!end) return null
  const actual = goal.savedAmount / goal.targetAmount
  if (now.getTime() > end.getTime()) {
    return { expected: 1, actual, overdue: goal.savedAmount < goal.targetAmount }
  }
  const span = end.getTime() - goal.createdAt
  const expected = span <= 0 ? 1 : Math.min(1, Math.max(0, (now.getTime() - goal.createdAt) / span))
  return { expected, actual, overdue: false }
}

export function goalSummary(goals: Goal[]): GoalSummary {
  const active = goals.filter((goal) => goal.status === 'active' && goal.targetAmount > 0)
  const target = active.reduce((sum, goal) => sum + goal.targetAmount, 0)
  const saved = active.reduce((sum, goal) => sum + goal.savedAmount, 0)
  return {
    activeCount: active.length,
    target,
    saved,
    ratio: target > 0 ? saved / target : 0,
  }
}

export function monthAllocation(data: AppData, month: string): MonthAllocation {
  const allocated = data.allocations
    .filter((item) => item.month === month)
    .reduce((sum, item) => sum + item.amount, 0)
  const balance = getMonthFigures(data, month).balance
  return { allocated, balance, remaining: balance - allocated }
}

function bookInYear(book: Book, year: number): boolean {
  const key = String(year)
  if (book.finishDate.startsWith(key) || book.startDate.startsWith(key)) return true
  if (!book.finishDate && !book.startDate) return new Date(book.createdAt).getFullYear() === year
  return false
}

export function bookSavedAmount(book: Book): number {
  if (book.source !== 'borrow' && book.source !== 'library') return 0
  return Math.max(0, book.listPrice - book.paid)
}

export function getReadingStats(books: Book[], year: number): ReadingStats {
  const finished = books.filter((book) => {
    if (book.status !== 'finished') return false
    if (book.finishDate.startsWith(String(year))) return true
    return !book.finishDate && new Date(book.createdAt).getFullYear() === year
  })
  const saved = books
    .filter((book) => book.status !== 'wishlist' && bookInYear(book, year))
    .reduce((sum, book) => sum + bookSavedAmount(book), 0)
  return {
    year,
    finishedCount: finished.length,
    pages: finished.reduce((sum, book) => sum + (book.pages ?? 0), 0),
    saved,
  }
}
