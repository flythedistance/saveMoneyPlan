<script setup lang="ts">
import { formatCents } from '../utils/money'

export interface BarItem {
  id: string
  label: string
  value: number
  max: number
  hint?: string
  tone?: 'red' | 'green'
}

defineProps<{ items: BarItem[] }>()

function width(value: number, max: number) {
  if (max <= 0) return '0%'
  return `${Math.min(100, Math.round((value / max) * 100))}%`
}
</script>

<template>
  <ul class="bars">
    <li v-for="item in items" :key="item.id">
      <div class="bar-label">
        <span>{{ item.label }}</span>
        <span>{{ item.hint ?? formatCents(item.value) }}</span>
      </div>
      <div class="track" :class="item.tone === 'red' ? 'red' : 'green'">
        <div class="fill" :style="{ width: width(item.value, item.max) }" />
      </div>
    </li>
  </ul>
</template>
