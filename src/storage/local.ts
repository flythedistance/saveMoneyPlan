import { createEmptyData, defaultCategories } from '../data/defaults'
import { accumulateMonth, monthOf } from '../domain/stats'
import type {
  Allocation,
  AppData,
  AppSettings,
  Book,
  BookSource,
  BookStatus,
  Category,
  CategoryBudget,
  CleanupRecord,
  FlowType,
  Goal,
  GoalStatus,
  MonthSnapshot,
  SavingsPlan,
  Transaction,
} from '../types'
import { formatMonth } from '../utils/date'

export const STORAGE_KEY = 'saveMoneyPlan.v1'
export const BACKUP_KEY = 'saveMoneyPlan.v1.bak'
export const SOFT_LIMIT_BYTES = Math.floor(3.5 * 1024 * 1024)
export const MIN_DETAIL_MONTHS = 2

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface SaveResult {
  data: AppData
  error: string | null
}

const bookStatuses: BookStatus[] = ['wishlist', 'reading', 'finished']
const bookSources: BookSource[] = ['buy', 'borrow', 'library', 'ebook']
const goalStatuses: GoalStatus[] = ['active', 'paused', 'done']

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

export function estimateBytes(data: AppData): number {
  return byteLength(JSON.stringify(data))
}

export function transactionMonths(transactions: Transaction[]): string[] {
  return [...new Set(transactions.map((item) => monthOf(item.date)))].sort()
}

export function retentionCutoff(now: Date, retentionMonths: number): string {
  const keep = Math.min(120, Math.max(1, Math.round(retentionMonths) || 24))
  const cursor = new Date(now.getFullYear(), now.getMonth() - (keep - 1), 1)
  return formatMonth(cursor)
}

export function monthsToArchiveByRetention(data: AppData, now: Date): string[] {
  const cutoff = retentionCutoff(now, data.settings.retentionMonths)
  return transactionMonths(data.transactions).filter((month) => month < cutoff)
}

export function archiveMonth(data: AppData, month: string): AppData | null {
  const live = data.transactions.filter((item) => monthOf(item.date) === month)
  if (live.length === 0) return null
  const existing = data.snapshots.find((item) => item.month === month)
  const snapshot = accumulateMonth(existing, live, month)
  return {
    ...data,
    transactions: data.transactions.filter((item) => monthOf(item.date) !== month),
    snapshots: [...data.snapshots.filter((item) => item.month !== month), snapshot].sort((a, b) =>
      a.month.localeCompare(b.month),
    ),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCents(value: unknown, allowZero = true): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value <= 1_000_000_000_000 &&
    value >= (allowZero ? 0 : 1)
  )
}

function isFlowType(value: unknown): value is FlowType {
  return value === 'income' || value === 'expense'
}

function isShortString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

function parseCategory(value: unknown): Category | null {
  if (!isRecord(value) || !isShortString(value.id, 40) || !isShortString(value.name, 20)) return null
  if (!isFlowType(value.type)) return null
  return { id: value.id, name: value.name.trim(), type: value.type, builtin: value.builtin === true }
}

function parseTransaction(value: unknown): Transaction | null {
  if (!isRecord(value)) return null
  if (!isShortString(value.id, 80) || !isFlowType(value.type) || !isCents(value.amount, false)) return null
  if (!isShortString(value.categoryId, 40) || typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) {
    return null
  }
  if (typeof value.note !== 'string' || typeof value.createdAt !== 'number') return null
  return {
    id: value.id,
    type: value.type,
    amount: value.amount,
    categoryId: value.categoryId,
    date: value.date,
    note: value.note.slice(0, 80),
    createdAt: value.createdAt,
  }
}

function parseSnapshot(value: unknown): MonthSnapshot | null {
  if (!isRecord(value) || typeof value.month !== 'string' || !/^\d{4}-\d{2}$/.test(value.month)) return null
  if (!isCents(value.income) || !isCents(value.expense) || !isRecord(value.byCategory)) return null
  const byCategory: Record<string, number> = {}
  for (const [id, amount] of Object.entries(value.byCategory)) {
    if (isCents(amount)) byCategory[id] = amount
  }
  return { month: value.month, income: value.income, expense: value.expense, byCategory }
}

function parseGoal(value: unknown): Goal | null {
  if (!isRecord(value) || !isShortString(value.id, 80) || !isShortString(value.name, 40)) return null
  if (!isCents(value.targetAmount, false) || !isCents(value.savedAmount)) return null
  if (typeof value.deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.deadline)) return null
  if (typeof value.note !== 'string' || typeof value.createdAt !== 'number') return null
  if (typeof value.status !== 'string' || !goalStatuses.includes(value.status as GoalStatus)) return null
  return {
    id: value.id,
    name: value.name.trim(),
    targetAmount: value.targetAmount,
    savedAmount: value.savedAmount,
    deadline: value.deadline,
    note: value.note.slice(0, 200),
    createdAt: value.createdAt,
    status: value.status as GoalStatus,
  }
}

function parseBudget(value: unknown): CategoryBudget | null {
  if (!isRecord(value) || !isShortString(value.categoryId, 40) || !isCents(value.limit)) return null
  return { categoryId: value.categoryId, limit: value.limit }
}

function parsePlan(value: unknown): SavingsPlan | null {
  if (!isRecord(value) || !isShortString(value.id, 80)) return null
  if (typeof value.year !== 'number' || value.year < 2000 || value.year > 2100) return null
  if (!isCents(value.monthlySaveTarget) || !Array.isArray(value.categoryBudgets)) return null
  return {
    id: value.id,
    year: value.year,
    monthlySaveTarget: value.monthlySaveTarget,
    categoryBudgets: value.categoryBudgets.map(parseBudget).filter((item): item is CategoryBudget => item !== null),
    note: typeof value.note === 'string' ? value.note.slice(0, 200) : '',
  }
}

function parseBook(value: unknown): Book | null {
  if (!isRecord(value) || !isShortString(value.id, 80) || !isShortString(value.title, 80)) return null
  if (typeof value.status !== 'string' || !bookStatuses.includes(value.status as BookStatus)) return null
  if (typeof value.source !== 'string' || !bookSources.includes(value.source as BookSource)) return null
  if (!isCents(value.listPrice) || !isCents(value.paid) || typeof value.createdAt !== 'number') return null
  const pages = value.pages === null ? null : isCents(value.pages, false) && value.pages <= 20000 ? value.pages : null
  const rating =
    value.rating === null ? null : typeof value.rating === 'number' && value.rating >= 1 && value.rating <= 5 ? value.rating : null
  return {
    id: value.id,
    title: value.title.trim(),
    author: typeof value.author === 'string' ? value.author.slice(0, 40) : '',
    status: value.status as BookStatus,
    source: value.source as BookSource,
    listPrice: value.listPrice,
    paid: value.paid,
    startDate: typeof value.startDate === 'string' ? value.startDate : '',
    finishDate: typeof value.finishDate === 'string' ? value.finishDate : '',
    pages,
    rating,
    note: typeof value.note === 'string' ? value.note.slice(0, 200) : '',
    createdAt: value.createdAt,
  }
}

function parseAllocation(value: unknown): Allocation | null {
  if (!isRecord(value) || !isShortString(value.id, 80) || !isShortString(value.goalId, 80)) return null
  if (typeof value.month !== 'string' || !/^\d{4}-\d{2}$/.test(value.month)) return null
  if (!isCents(value.amount, false) || typeof value.createdAt !== 'number') return null
  return {
    id: value.id,
    goalId: value.goalId,
    month: value.month,
    amount: value.amount,
    createdAt: value.createdAt,
  }
}

function parseCleanup(value: unknown): CleanupRecord | null {
  if (!isRecord(value) || typeof value.from !== 'string' || typeof value.to !== 'string') return null
  if (typeof value.at !== 'number' || !Array.isArray(value.months)) return null
  return {
    from: value.from,
    to: value.to,
    at: value.at,
    months: value.months.filter((item): item is string => typeof item === 'string'),
  }
}

function parseSettings(value: unknown): AppSettings {
  const record = isRecord(value) ? value : {}
  const retention = record.retentionMonths
  return {
    retentionMonths:
      typeof retention === 'number' && retention >= 1 && retention <= 120 ? Math.round(retention) : 24,
    lastCleanup: parseCleanup(record.lastCleanup),
    cleanupNoticeSeenAt: typeof record.cleanupNoticeSeenAt === 'number' ? record.cleanupNoticeSeenAt : null,
  }
}

export function normalize(data: AppData): AppData {
  const categories = [...data.categories]
  for (const item of defaultCategories) {
    if (!categories.some((category) => category.id === item.id)) categories.push({ ...item })
  }
  return { ...data, version: 1, categories }
}

export function parseAppData(raw: unknown): AppData | null {
  if (!isRecord(raw) || !Array.isArray(raw.categories) || !Array.isArray(raw.transactions)) return null
  const data: AppData = {
    version: 1,
    categories: raw.categories.map(parseCategory).filter((item): item is Category => item !== null),
    transactions: raw.transactions.map(parseTransaction).filter((item): item is Transaction => item !== null),
    snapshots: Array.isArray(raw.snapshots)
      ? raw.snapshots.map(parseSnapshot).filter((item): item is MonthSnapshot => item !== null)
      : [],
    goals: Array.isArray(raw.goals) ? raw.goals.map(parseGoal).filter((item): item is Goal => item !== null) : [],
    plans: Array.isArray(raw.plans)
      ? raw.plans.map(parsePlan).filter((item): item is SavingsPlan => item !== null)
      : [],
    books: Array.isArray(raw.books) ? raw.books.map(parseBook).filter((item): item is Book => item !== null) : [],
    allocations: Array.isArray(raw.allocations)
      ? raw.allocations.map(parseAllocation).filter((item): item is Allocation => item !== null)
      : [],
    settings: parseSettings(raw.settings),
  }
  return normalize(data)
}

function stampCleanup(data: AppData, months: string[], now: Date): AppData {
  if (months.length === 0) return data
  const sorted = [...new Set(months)].sort()
  return {
    ...data,
    settings: {
      ...data.settings,
      lastCleanup: {
        from: sorted[0],
        to: sorted[sorted.length - 1],
        at: now.getTime(),
        months: sorted,
      },
      cleanupNoticeSeenAt: null,
    },
  }
}

function shrinkForStorage(data: AppData, now: Date, maxBytes: number): { data: AppData; archived: string[] } {
  const archived: string[] = []
  let current = data
  for (const month of monthsToArchiveByRetention(current, now)) {
    const next = archiveMonth(current, month)
    if (!next) continue
    current = next
    archived.push(month)
  }
  while (estimateBytes(stampCleanup(current, archived, now)) > maxBytes) {
    const months = transactionMonths(current.transactions)
    if (months.length <= MIN_DETAIL_MONTHS) break
    const next = archiveMonth(current, months[0])
    if (!next) break
    archived.push(months[0])
    current = next
  }
  return { data: stampCleanup(current, archived, now), archived }
}

export function isQuotaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('name' in error)) return false
  const name = String(error.name)
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
}

export function saveAppData(
  data: AppData,
  options: { storage: KeyValueStore; maxBytes?: number; now?: Date },
): SaveResult {
  const now = options.now ?? new Date()
  const maxBytes = options.maxBytes ?? SOFT_LIMIT_BYTES
  const shrunk = shrinkForStorage(data, now, maxBytes)
  let current = shrunk.data
  const archived = [...shrunk.archived]

  const write = (value: AppData) => {
    options.storage.setItem(STORAGE_KEY, JSON.stringify(value))
  }

  try {
    write(current)
    return { data: current, error: null }
  } catch (error) {
    if (!isQuotaError(error)) return { data, error: '数据没有写入本地存储。' }
  }

  for (let guard = 0; guard < 240; guard += 1) {
    const months = transactionMonths(current.transactions)
    if (months.length <= MIN_DETAIL_MONTHS) break
    const next = archiveMonth(current, months[0])
    if (!next) break
    archived.push(months[0])
    current = stampCleanup(next, archived, now)
    try {
      write(current)
      return { data: current, error: null }
    } catch (error) {
      if (!isQuotaError(error)) return { data, error: '数据没有写入本地存储。' }
    }
  }

  return {
    data,
    error: '本地存储空间不够，这次修改没有保存。请先导出备份，或删掉一些较早的明细后再试。',
  }
}

function browserStore(): KeyValueStore | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage
}

export function loadBrowserData(): SaveResult {
  const storage = browserStore()
  if (!storage) return { data: createEmptyData(), error: '浏览器存储暂时读不出来。' }
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return { data: createEmptyData(), error: null }
    const parsed = parseAppData(JSON.parse(raw) as unknown)
    if (!parsed) {
      try {
        storage.setItem(BACKUP_KEY, raw)
      } catch {
        // The backup is best-effort. Reading still falls back to an empty ledger.
      }
      return { data: createEmptyData(), error: '本地数据无法读取，已保留备份并重新开始。' }
    }
    return { data: parsed, error: null }
  } catch {
    return { data: createEmptyData(), error: '浏览器存储暂时读不出来。' }
  }
}

export function saveBrowserData(data: AppData): SaveResult {
  const storage = browserStore()
  if (!storage) return { data, error: '浏览器存储暂时写不进去。' }
  return saveAppData(data, { storage, maxBytes: SOFT_LIMIT_BYTES, now: new Date() })
}
