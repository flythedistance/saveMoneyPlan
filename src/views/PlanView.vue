<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import YearSwitcher from '../components/YearSwitcher.vue'
import { useAppStore } from '../stores/app'
import { centsToYuanInput, parseYuanToCents } from '../utils/money'

const store = useAppStore()
const year = ref(new Date().getFullYear())
const monthly = ref('')
const note = ref('')
const error = ref('')
const saved = ref(false)
const budgets = reactive<Record<string, string>>({})
const expenseCategories = computed(() => store.data.categories.filter((item) => item.type === 'expense'))
const currentPlan = computed(() => store.data.plans.find((item) => item.year === year.value) ?? null)

function load(value: number) {
  const plan = store.data.plans.find((item) => item.year === value)
  monthly.value = plan ? centsToYuanInput(plan.monthlySaveTarget) : ''
  note.value = plan?.note ?? ''
  for (const category of expenseCategories.value) {
    const limit = plan?.categoryBudgets.find((item) => item.categoryId === category.id)?.limit ?? 0
    budgets[category.id] = limit ? centsToYuanInput(limit) : ''
  }
  saved.value = false
  error.value = ''
}

watch(year, load, { immediate: true })

function markDirty() {
  saved.value = false
}

function save() {
  const monthlySaveTarget = parseYuanToCents(monthly.value, { allowZero: true })
  if (monthlySaveTarget == null) {
    error.value = '每月应存请填数字，可以是 0。'
    return
  }
  const categoryBudgets = []
  for (const category of expenseCategories.value) {
    const limit = parseYuanToCents(budgets[category.id] ?? '', { allowZero: true })
    if (limit == null) {
      error.value = `「${category.name}」的预算格式不对。`
      return
    }
    categoryBudgets.push({ categoryId: category.id, limit })
  }
  store.savePlan({ year: year.value, monthlySaveTarget, categoryBudgets, note: note.value })
  saved.value = true
  error.value = ''
}
</script>

<template>
  <PageHeader title="省钱计划" lede="先定每个月要存多少，再给常花的分类一个上限。留空表示不设上限。" />
  <form class="stack" @submit.prevent="save">
    <YearSwitcher v-model="year" />
    <section class="card form-grid">
      <label class="field">
        <span>每月应存（元）</span>
        <input v-model="monthly" data-testid="plan-monthly" inputmode="decimal" placeholder="0" @input="markDirty" />
      </label>
      <h2>分类预算</h2>
      <label v-for="category in expenseCategories" :key="category.id" class="field">
        <span>{{ category.name }}（元）</span>
        <input
          v-model="budgets[category.id]"
          :data-testid="`budget-${category.id}`"
          inputmode="decimal"
          placeholder="不限额"
          @input="markDirty"
        />
      </label>
      <label class="field">
        <span>备注</span>
        <textarea v-model="note" maxlength="200" @input="markDirty" />
      </label>
      <p v-if="error" class="form-error">{{ error }}</p>
      <p v-else-if="saved" class="note">{{ year }} 年的计划已保存。</p>
      <div class="form-actions">
        <button v-if="currentPlan" type="button" class="btn danger ghost" @click="store.clearPlan(year); load(year)">
          清除{{ year }}年计划
        </button>
        <button type="submit" class="btn primary" data-testid="save-plan">保存计划</button>
      </div>
    </section>
  </form>
</template>
