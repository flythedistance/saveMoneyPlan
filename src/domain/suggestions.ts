import type { AppData } from '../types'
import { formatCents } from '../utils/money'
import { categoryName, getMonthFigures, getPlanProgress, goalPace } from './stats'
import { shiftMonth } from '../utils/date'

export interface Suggestion {
  id: string
  severity: 'high' | 'medium' | 'low'
  title: string
  detail: string
}

const severityRank = { high: 0, medium: 1, low: 2 }

function asPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function topExpenseName(data: AppData, byCategory: Record<string, number>): string | null {
  let topId = ''
  let topAmount = 0
  for (const [id, amount] of Object.entries(byCategory)) {
    if (data.categories.find((item) => item.id === id)?.type === 'income') continue
    if (amount > topAmount) {
      topAmount = amount
      topId = id
    }
  }
  return topId ? categoryName(data.categories, topId) : null
}

export function buildSuggestions(data: AppData, month: string, now = new Date()): Suggestion[] {
  const suggestions: Suggestion[] = []
  const progress = getPlanProgress(data, month)
  const figures = progress.figures
  const previous = getMonthFigures(data, shiftMonth(month, -1))

  for (const goal of data.goals) {
    if (goal.status !== 'active') continue
    const pace = goalPace(goal, now)
    if (!pace?.overdue) continue
    const gap = Math.max(0, goal.targetAmount - goal.savedAmount)
    suggestions.push({
      id: `overdue:${goal.id}`,
      severity: 'high',
      title: `「${goal.name}」已经过了截止日期`,
      detail: `还差 ${formatCents(gap)}。可以补存一笔，或者把截止日期改到你真的能完成的时候。`,
    })
  }

  for (const row of progress.rows) {
    if (row.limit <= 0 || row.spent <= row.limit) continue
    suggestions.push({
      id: `budget:${month}:${row.id}`,
      severity: 'high',
      title: `「${row.name}」超出了本月预算`,
      detail: `已经花了 ${formatCents(row.spent)}，预算是 ${formatCents(row.limit)}，超出 ${formatCents(row.spent - row.limit)}。`,
    })
  }

  for (const goal of data.goals) {
    if (goal.status !== 'active') continue
    const pace = goalPace(goal, now)
    if (!pace || pace.overdue) continue
    if (pace.expected < 0.15 || pace.expected - pace.actual <= 0.05) continue
    suggestions.push({
      id: `pace:${goal.id}`,
      severity: 'medium',
      title: `「${goal.name}」进度落后于时间`,
      detail: `目前完成 ${asPercent(pace.actual)}，按截止日期大约应该到 ${asPercent(pace.expected)}。`,
    })
  }

  if (progress.plan && progress.target > 0 && figures.hasData && figures.balance < progress.target) {
    const behind = progress.target - figures.balance
    suggestions.push({
      id: `save:${month}`,
      severity: figures.balance < 0 ? 'high' : 'medium',
      title: figures.balance < 0 ? '这个月还没有存下钱' : '本月结余还没达到应存金额',
      detail: `本月结余 ${formatCents(figures.balance)}，距离应存 ${formatCents(progress.target)} 还差 ${formatCents(behind)}。`,
    })
  }

  if (figures.hasData && previous.hasData && previous.expense > 0) {
    const ratio = (figures.expense - previous.expense) / previous.expense
    if (ratio > 0.2) {
      const top = topExpenseName(data, figures.byCategory)
      suggestions.push({
        id: `mom:${month}`,
        severity: 'medium',
        title: '本月支出比上月高出两成以上',
        detail: `本月支出 ${formatCents(figures.expense)}，上月是 ${formatCents(previous.expense)}，增加了 ${Math.round(ratio * 100)}%。${top ? `花得最多的是${top}。` : ''}`,
      })
    }
  }

  const pricey = data.books.filter((book) => book.status === 'wishlist' && book.listPrice >= 5000)
  if (pricey.length > 0) {
    const titles = pricey
      .slice(0, 3)
      .map((book) => `《${book.title}》`)
      .join('、')
    suggestions.push({
      id: 'books:library',
      severity: 'low',
      title: '想读的书可以先借',
      detail: `${titles}${pricey.length > 3 ? ' 等' : ''}标价不低于 ${formatCents(5000)}。先去图书馆借，能少花一笔。`,
    })
  }

  return suggestions.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
}
