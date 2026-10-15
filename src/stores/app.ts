import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createEmptyData } from '../data/defaults'
import type { Book, BookSource, BookStatus, CategoryBudget, FlowType, GoalStatus } from '../types'
import { currentMonth, isDateKey, isMonthKey } from '../utils/date'
import { clip, createId } from '../utils/id'
import { estimateBytes, loadBrowserData, parseAppData, saveBrowserData } from '../storage/local'

export interface TransactionInput {
  id?: string
  type: FlowType
  amount: number
  categoryId: string
  date: string
  note: string
}

export interface GoalInput {
  id?: string
  name: string
  targetAmount: number
  deadline: string
  note: string
}

export interface PlanInput {
  year: number
  monthlySaveTarget: number
  categoryBudgets: CategoryBudget[]
  note: string
}

export interface BookInput {
  id?: string
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
}

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export const useAppStore = defineStore('app', () => {
  const loaded = loadBrowserData()
  const data = ref(loaded.data)
  const persistError = ref<string | null>(loaded.error)
  const activeMonth = ref(currentMonth())
  const storageBytes = computed(() => estimateBytes(data.value))

  function commit(recipe: (draft: ReturnType<typeof createEmptyData>) => void) {
    const draft = cloneData(data.value)
    recipe(draft)
    if (JSON.stringify(draft) === JSON.stringify(data.value)) return
    const saved = saveBrowserData(draft)
    data.value = saved.data
    persistError.value = saved.error
  }

  function setActiveMonth(month: string) {
    if (isMonthKey(month)) activeMonth.value = month
  }

  function saveTransaction(input: TransactionInput) {
    if (!isDateKey(input.date) || input.amount <= 0) return
    commit((draft) => {
      const category = draft.categories.find((item) => item.id === input.categoryId)
      if (!category || category.type !== input.type) return
      const note = clip(input.note, 80)
      if (input.id) {
        const existing = draft.transactions.find((item) => item.id === input.id)
        if (!existing) return
        existing.type = input.type
        existing.amount = input.amount
        existing.categoryId = input.categoryId
        existing.date = input.date
        existing.note = note
        return
      }
      draft.transactions.push({
        id: createId(),
        type: input.type,
        amount: input.amount,
        categoryId: input.categoryId,
        date: input.date,
        note,
        createdAt: Date.now(),
      })
    })
  }

  function removeTransaction(id: string) {
    commit((draft) => {
      draft.transactions = draft.transactions.filter((item) => item.id !== id)
    })
  }

  function saveGoal(input: GoalInput) {
    const name = clip(input.name, 40)
    if (!name || input.targetAmount <= 0 || !isDateKey(input.deadline)) return
    commit((draft) => {
      const note = clip(input.note, 200)
      if (input.id) {
        const existing = draft.goals.find((item) => item.id === input.id)
        if (!existing) return
        existing.name = name
        existing.targetAmount = input.targetAmount
        existing.deadline = input.deadline
        existing.note = note
        if (existing.savedAmount >= existing.targetAmount) existing.status = 'done'
        return
      }
      draft.goals.push({
        id: createId(),
        name,
        targetAmount: input.targetAmount,
        savedAmount: 0,
        deadline: input.deadline,
        note,
        createdAt: Date.now(),
        status: 'active',
      })
    })
  }

  function depositToGoal(id: string, amount: number) {
    if (amount <= 0) return
    commit((draft) => {
      const goal = draft.goals.find((item) => item.id === id)
      if (!goal) return
      goal.savedAmount += amount
      if (goal.savedAmount >= goal.targetAmount) goal.status = 'done'
    })
  }

  function allocateBalance(id: string, month: string) {
    if (!isMonthKey(month)) return
    commit((draft) => {
      const goal = draft.goals.find((item) => item.id === id)
      if (!goal || goal.status !== 'active') return
      const allocated = draft.allocations
        .filter((item) => item.month === month)
        .reduce((sum, item) => sum + item.amount, 0)
      const income = draft.transactions
        .filter((item) => item.date.startsWith(month) && item.type === 'income')
        .reduce((sum, item) => sum + item.amount, 0)
      const expense = draft.transactions
        .filter((item) => item.date.startsWith(month) && item.type === 'expense')
        .reduce((sum, item) => sum + item.amount, 0)
      const snapshot = draft.snapshots.find((item) => item.month === month)
      const balance = (snapshot?.income ?? 0) + income - ((snapshot?.expense ?? 0) + expense)
      const remaining = balance - allocated
      if (remaining <= 0) return
      goal.savedAmount += remaining
      draft.allocations.push({
        id: createId(),
        goalId: id,
        month,
        amount: remaining,
        createdAt: Date.now(),
      })
      if (goal.savedAmount >= goal.targetAmount) goal.status = 'done'
    })
  }

  function setGoalStatus(id: string, status: GoalStatus) {
    commit((draft) => {
      const goal = draft.goals.find((item) => item.id === id)
      if (goal) goal.status = status
    })
  }

  function removeGoal(id: string) {
    commit((draft) => {
      draft.goals = draft.goals.filter((item) => item.id !== id)
      draft.allocations = draft.allocations.filter((item) => item.goalId !== id)
    })
  }

  function savePlan(input: PlanInput) {
    if (input.year < 2000 || input.year > 2100 || input.monthlySaveTarget < 0) return
    commit((draft) => {
      const existing = draft.plans.find((item) => item.year === input.year)
      const next = {
        id: existing?.id ?? createId(),
        year: input.year,
        monthlySaveTarget: input.monthlySaveTarget,
        categoryBudgets: input.categoryBudgets.filter((item) => item.limit >= 0),
        note: clip(input.note, 200),
      }
      draft.plans = [...draft.plans.filter((item) => item.year !== input.year), next]
    })
  }

  function clearPlan(year: number) {
    commit((draft) => {
      draft.plans = draft.plans.filter((item) => item.year !== year)
    })
  }

  function saveBook(input: BookInput) {
    const title = clip(input.title, 80)
    if (!title || input.listPrice < 0 || input.paid < 0) return
    commit((draft) => {
      const next: Book = {
        id: input.id ?? createId(),
        title,
        author: clip(input.author, 40),
        status: input.status,
        source: input.source,
        listPrice: input.listPrice,
        paid: input.paid,
        startDate: isDateKey(input.startDate) ? input.startDate : '',
        finishDate: isDateKey(input.finishDate) ? input.finishDate : '',
        pages: input.pages && input.pages > 0 && input.pages <= 20000 ? Math.round(input.pages) : null,
        rating: input.rating && input.rating >= 1 && input.rating <= 5 ? input.rating : null,
        note: clip(input.note, 200),
        createdAt: Date.now(),
      }
      if (input.id) {
        const existing = draft.books.find((item) => item.id === input.id)
        if (!existing) return
        next.createdAt = existing.createdAt
        next.id = existing.id
        Object.assign(existing, next)
        return
      }
      draft.books.push(next)
    })
  }

  function removeBook(id: string) {
    commit((draft) => {
      draft.books = draft.books.filter((item) => item.id !== id)
    })
  }

  function setRetentionMonths(months: number) {
    if (!Number.isFinite(months)) return
    const value = Math.min(120, Math.max(1, Math.round(months)))
    commit((draft) => {
      draft.settings.retentionMonths = value
    })
  }

  function dismissCleanup() {
    commit((draft) => {
      if (draft.settings.lastCleanup) draft.settings.cleanupNoticeSeenAt = draft.settings.lastCleanup.at
    })
  }

  function importData(text: string): string | null {
    let raw: unknown
    try {
      raw = JSON.parse(text) as unknown
    } catch {
      return '文件不是有效的 JSON。'
    }
    const parsed = parseAppData(raw)
    if (!parsed) return '这个文件不是省钱计划的备份。'
    const saved = saveBrowserData(parsed)
    data.value = saved.data
    persistError.value = saved.error
    return saved.error
  }

  return {
    data,
    persistError,
    activeMonth,
    storageBytes,
    setActiveMonth,
    saveTransaction,
    removeTransaction,
    saveGoal,
    depositToGoal,
    allocateBalance,
    setGoalStatus,
    removeGoal,
    savePlan,
    clearPlan,
    saveBook,
    removeBook,
    setRetentionMonths,
    dismissCleanup,
    importData,
  }
})
