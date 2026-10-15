const MAX_CENTS = 1_000_000_000_000

export function formatCents(cents: number): string {
  const negative = cents < 0
  const abs = Math.abs(Math.round(cents))
  const yuan = Math.floor(abs / 100)
  const fraction = String(abs % 100).padStart(2, '0')
  return `${negative ? '-' : ''}¥${yuan.toLocaleString('zh-CN')}.${fraction}`
}

export function formatSignedCents(cents: number, type: 'income' | 'expense'): string {
  return `${type === 'expense' ? '-' : '+'}${formatCents(cents)}`
}

export function centsToYuanInput(cents: number): string {
  const abs = Math.abs(Math.round(cents))
  const yuan = Math.floor(abs / 100)
  const fraction = String(abs % 100).padStart(2, '0')
  return fraction === '00' ? String(yuan) : `${yuan}.${fraction}`
}

export function parseYuanToCents(input: string, options?: { allowZero?: boolean }): number | null {
  const allowZero = options?.allowZero ?? false
  const cleaned = input.trim().replace(/[¥,\s]/g, '')
  if (cleaned === '') return allowZero ? 0 : null
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole, fraction = ''] = cleaned.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) return null
  if (cents === 0 && !allowZero) return null
  return cents
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
