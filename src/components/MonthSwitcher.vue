<script setup lang="ts">
import { shiftMonth } from '../utils/date'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function shift(delta: number) {
  emit('update:modelValue', shiftMonth(props.modelValue, delta))
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (/^\d{4}-\d{2}$/.test(value)) emit('update:modelValue', value)
}
</script>

<template>
  <div class="switcher">
    <button type="button" class="btn" @click="shift(-1)">上个月</button>
    <input :value="modelValue" type="month" aria-label="选择月份" @input="onInput" />
    <button type="button" class="btn" @click="shift(1)">下个月</button>
  </div>
</template>
