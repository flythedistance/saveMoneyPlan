import type { Category, AppData } from '../types'

export const defaultCategories: Category[] = [
  { id: 'exp-food', name: '餐饮', type: 'expense', builtin: true },
  { id: 'exp-transport', name: '交通', type: 'expense', builtin: true },
  { id: 'exp-shopping', name: '购物', type: 'expense', builtin: true },
  { id: 'exp-housing', name: '住房', type: 'expense', builtin: true },
  { id: 'exp-fun', name: '娱乐', type: 'expense', builtin: true },
  { id: 'exp-sub', name: '订阅', type: 'expense', builtin: true },
  { id: 'exp-medical', name: '医疗', type: 'expense', builtin: true },
  { id: 'exp-edu', name: '教育', type: 'expense', builtin: true },
  { id: 'exp-other', name: '其他', type: 'expense', builtin: true },
  { id: 'inc-salary', name: '工资', type: 'income', builtin: true },
  { id: 'inc-side', name: '副业', type: 'income', builtin: true },
  { id: 'inc-other', name: '其他收入', type: 'income', builtin: true },
]

export function createEmptyData(): AppData {
  return {
    version: 1,
    categories: defaultCategories.map((item) => ({ ...item })),
    transactions: [],
    snapshots: [],
    goals: [],
    plans: [],
    books: [],
    allocations: [],
    settings: {
      retentionMonths: 24,
      lastCleanup: null,
      cleanupNoticeSeenAt: null,
    },
  }
}
