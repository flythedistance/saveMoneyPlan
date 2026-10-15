<script setup lang="ts">
const props = defineProps<{ modelValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function setYear(value: number) {
  if (value >= 2000 && value <= 2100) emit('update:modelValue', value)
}
</script>

<template>
  <div class="switcher">
    <button type="button" class="btn" @click="setYear(props.modelValue - 1)">上一年</button>
    <input
      :value="modelValue"
      type="number"
      min="2000"
      max="2100"
      aria-label="选择年份"
      @change="setYear(Number(($event.target as HTMLInputElement).value))"
    />
    <button type="button" class="btn" @click="setYear(props.modelValue + 1)">下一年</button>
  </div>
</template>
