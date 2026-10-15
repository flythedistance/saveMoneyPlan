<script setup lang="ts">
defineProps<{
  value: number
  marker?: number | null
  tone?: 'green' | 'red'
}>()

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
</script>

<template>
  <div class="track" :class="tone === 'red' ? 'red' : 'green'">
    <div class="fill" :style="{ width: `${clamp(value) * 100}%` }" />
    <i v-if="marker != null" class="marker" :style="{ left: `${clamp(marker) * 100}%` }" />
  </div>
</template>
