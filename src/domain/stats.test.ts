import { describe, expect, it } from 'vitest'
import { createEmptyData } from '../data/defaults'
import { buildSuggestions } from './suggestions'
import { getMonthFigures, getReadingStats, getYearFigures } from './stats'
import type { AppData, Book, Transaction } from '../types'

function tx(partial: Pick<Transaction, 'type' | 'amount' | 'categoryId' | 'date'>): Transaction {
  return {
    id: `${partial.date}-${partial.categoryId}-${partial.amount}`,
    note: '',
    createdAt: Date.parse(`${partial.date}T00:00:00`),
    ...partial,
  }
}

describe('figures', () => {
  it('adds a new transaction on top of an archived snapshot', () => {
    const data = createEmptyData()
    data.snapshots.push({
      month: '2026-01',
      income: 10000,
      expense: 4000,
      byCategory: { 'exp-food': 4000 },
    })
    data.transactions.push(tx({ type: 'expense', amount: 500, categoryId: 'exp-food', date: '2026-01-20' }))
    const month = getMonthFigures(data, '2026-01')
    expect(month.expense).toBe(4500)
    expect(month.income).toBe(10000)
    expect(month.byCategory['exp-food']).toBe(4500)
    expect(getYearFigures(data, 2026).balance).toBe(5500)
  })
})

describe('reading stats', () => {
  it('counts borrowed books started this year as money not spent', () => {
    const book: Book = {
      id: 'b1',
      title: '人间草木',
      author: '',
      status: 'reading',
      source: 'borrow',
      listPrice: 6800,
      paid: 0,
      startDate: '2026-10-01',
      finishDate: '',
      pages: null,
      rating: null,
      note: '',
      createdAt: Date.parse('2026-10-01T00:00:00'),
    }
    expect(getReadingStats([book], 2026).saved).toBe(6800)
    expect(getReadingStats([book], 2026).finishedCount).toBe(0)
  })
})

describe('suggestions', () => {
  it('flags a category that is over budget', () => {
    const data: AppData = createEmptyData()
    data.transactions.push(tx({ type: 'expense', amount: 18000, categoryId: 'exp-food', date: '2026-10-02' }))
    data.plans.push({
      id: 'p1',
      year: 2026,
      monthlySaveTarget: 50000,
      categoryBudgets: [{ categoryId: 'exp-food', limit: 15000 }],
      note: '',
    })
    const suggestions = buildSuggestions(data, '2026-10', new Date(2026, 9, 15))
    expect(suggestions.some((item) => item.id === 'budget:2026-10:exp-food' && item.severity === 'high')).toBe(true)
  })
})
