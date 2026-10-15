export type FlowType = 'income' | 'expense'
export type GoalStatus = 'active' | 'paused' | 'done'
export type BookStatus = 'wishlist' | 'reading' | 'finished'
export type BookSource = 'buy' | 'borrow' | 'library' | 'ebook'

export interface Category {
  id: string
  name: string
  type: FlowType
  builtin: boolean
}

export interface Transaction {
  id: string
  type: FlowType
  amount: number
  categoryId: string
  date: string
  note: string
  createdAt: number
}

export interface MonthSnapshot {
  month: string
  income: number
  expense: number
  byCategory: Record<string, number>
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  savedAmount: number
  deadline: string
  note: string
  createdAt: number
  status: GoalStatus
}

export interface CategoryBudget {
  categoryId: string
  limit: number
}

export interface SavingsPlan {
  id: string
  year: number
  monthlySaveTarget: number
  categoryBudgets: CategoryBudget[]
  note: string
}

export interface Book {
  id: string
  title: string
  author: string
  status: BookStatus
  source: BookSource
  listPrice: number
  paid: number
  startDate: string
  finishDate: string
  pages: number | null
  rating: number | null
  note: string
  createdAt: number
}

export interface Allocation {
  id: string
  goalId: string
  month: string
  amount: number
  createdAt: number
}

export interface CleanupRecord {
  from: string
  to: string
  at: number
  months: string[]
}

export interface AppSettings {
  retentionMonths: number
  lastCleanup: CleanupRecord | null
  cleanupNoticeSeenAt: number | null
}

export interface AppData {
  version: 1
  categories: Category[]
  transactions: Transaction[]
  snapshots: MonthSnapshot[]
  goals: Goal[]
  plans: SavingsPlan[]
  books: Book[]
  allocations: Allocation[]
  settings: AppSettings
}
