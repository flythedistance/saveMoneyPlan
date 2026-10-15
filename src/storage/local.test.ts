import { describe, expect, it } from 'vitest'
import { createEmptyData } from '../data/defaults'
import { getYearFigures } from '../domain/stats'
import type { Transaction } from '../types'
import {
  STORAGE_KEY,
  byteLength,
  estimateBytes,
  parseAppData,
  retentionCutoff,
  saveAppData,
  transactionMonths,
  type KeyValueStore,
} from './local'

class MemoryStorage implements KeyValueStore {
  value: string | null = null
  constructor(private readonly maxBytes: number) {}
  getItem(key: string) {
    return key === STORAGE_KEY ? this.value : null
  }
  setItem(key: string, value: string) {
    if (key !== STORAGE_KEY) return
    if (byteLength(value) > this.maxBytes) {
      const error = new Error('quota')
      error.name = 'QuotaExceededError'
      throw error
    }
    this.value = value
  }
}

function fatTx(month: string, amount: number): Transaction {
  return {
    id: `${month}-${amount}`,
    type: 'expense',
    amount,
    categoryId: 'exp-food',
    date: `${month}-15`,
    note: '记'.repeat(2000),
    createdAt: Date.parse(`${month}-15T00:00:00`),
  }
}

describe('retention', () => {
  it('keeps the newest 24 calendar months and archives the older ones', () => {
    const now = new Date(2026, 9, 15)
    expect(retentionCutoff(now, 24)).toBe('2024-11')
    const data = createEmptyData()
    data.transactions.push(fatTx('2024-10', 1000), fatTx('2024-11', 2000), fatTx('2026-10', 3000))
    const storage = new MemoryStorage(20_000_000)
    const saved = saveAppData(data, { storage, maxBytes: 20_000_000, now })
    expect(saved.error).toBeNull()
    expect(transactionMonths(saved.data.transactions)).toEqual(['2024-11', '2026-10'])
    expect(saved.data.snapshots.map((item) => item.month)).toContain('2024-10')
    expect(getYearFigures(saved.data, 2024).expense).toBe(3000)
    expect(saved.data.settings.lastCleanup?.from).toBe('2024-10')
  })
})

describe('storage pressure', () => {
  it('rolls the oldest months into snapshots once the soft limit is passed', () => {
    const data = createEmptyData()
    data.goals.push({
      id: 'goal-1',
      name: '旅行',
      targetAmount: 100000,
      savedAmount: 0,
      deadline: '2026-12-31',
      note: '',
      createdAt: Date.parse('2026-01-01T00:00:00'),
      status: 'active',
    })
    for (const month of ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10']) {
      data.transactions.push(fatTx(month, 4000))
    }
    const originalExpense = getYearFigures(data, 2026).expense
    const storage = new MemoryStorage(20_000_000)
    const saved = saveAppData(data, {
      storage,
      maxBytes: 1,
      now: new Date(2026, 9, 15),
    })
    expect(saved.error).toBeNull()
    expect(transactionMonths(saved.data.transactions)).toEqual(['2026-09', '2026-10'])
    expect(saved.data.snapshots.map((item) => item.month)).toEqual(['2026-06', '2026-07', '2026-08'])
    expect(getYearFigures(saved.data, 2026).expense).toBe(originalExpense)
    expect(saved.data.goals[0]?.name).toBe('旅行')
    expect(storage.value).toContain('2026-06')
  })

  it('archives through a quota error until the payload fits', () => {
    const data = createEmptyData()
    for (const month of ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10']) {
      data.transactions.push(fatTx(month, 2500))
    }
    let kept = data
    for (const month of ['2026-06', '2026-07', '2026-08']) {
      const next = {
        ...kept,
        transactions: kept.transactions.filter((item) => !item.date.startsWith(month)),
      }
      kept = next
    }
    const storage = new MemoryStorage(estimateBytes(kept) + 2500)
    const saved = saveAppData(data, {
      storage,
      maxBytes: Number.MAX_SAFE_INTEGER,
      now: new Date(2026, 9, 15),
    })
    expect(saved.error).toBeNull()
    expect(transactionMonths(saved.data.transactions).length).toBeLessThanOrEqual(2)
    expect(getYearFigures(saved.data, 2026).expense).toBe(12500)
    expect(storage.getItem(STORAGE_KEY)).toBeTruthy()
  })
})

describe('parseAppData', () => {
  it('rejects a file that is not a ledger and fills missing default categories', () => {
    expect(parseAppData({ hello: true })).toBeNull()
    const parsed = parseAppData({
      categories: [],
      transactions: [],
      goals: [
        {
          id: 'g1',
          name: '应急金',
          targetAmount: 100,
          savedAmount: 0,
          deadline: '2026-12-31',
          note: '',
          createdAt: 1,
          status: 'active',
        },
      ],
    })
    expect(parsed?.categories.some((item) => item.id === 'exp-food')).toBe(true)
    expect(parsed?.goals).toHaveLength(1)
  })
})
