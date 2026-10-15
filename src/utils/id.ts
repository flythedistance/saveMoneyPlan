export function createId(): string {
  return crypto.randomUUID()
}

export function clip(value: string, max: number): string {
  return value.trim().slice(0, max)
}
