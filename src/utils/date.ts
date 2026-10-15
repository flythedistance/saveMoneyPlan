export function formatMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function currentMonth(date = new Date()): string {
  return formatMonth(date)
}

export function todayString(date = new Date()): string {
  return `${formatMonth(date)}-${String(date.getDate()).padStart(2, '0')}`
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split('-').map(Number)
  return formatMonth(new Date(year, monthIndex - 1 + delta, 1))
}

export function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split('-')
  return `${year}年${Number(monthIndex)}月`
}

export function formatDateLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const week = ['日', '一', '二', '三', '四', '五', '六'][new Date(year, month - 1, day).getDay()] ?? ''
  return `${year}年${month}月${day}日 周${week}`
}

export function parseDeadline(deadline: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null
  const [year, month, day] = deadline.split('-').map(Number)
  return new Date(year, month - 1, day, 23, 59, 59)
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value)
}

export function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}
