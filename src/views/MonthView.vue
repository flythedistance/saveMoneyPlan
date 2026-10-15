<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import CategoryBars from '../components/CategoryBars.vue'
import EmptyState from '../components/EmptyState.vue'
import MonthSwitcher from '../components/MonthSwitcher.vue'
import PageHeader from '../components/PageHeader.vue'
import { expenseBreakdown, getMonthFigures, getPlanProgress } from '../domain/stats'
import { useAppStore } from '../stores/app'
import { formatMonthLabel, shiftMonth } from '../utils/date'
import { formatCents } from '../utils/money'

const store = useAppStore()
const figures = computed(() => getMonthFigures(store.data, store.activeMonth))
const previous = computed(() => getMonthFigures(store.data, shiftMonth(store.activeMonth, -1)))
const progress = computed(() => getPlanProgress(store.data, store.activeMonth))
const breakdown = computed(() => expenseBreakdown(store.data, figures.value.byCategory))
const maxShare = computed(() => breakdown.value[0]?.amount ?? 1)
const budgetRows = computed(() => progress.value.rows.filter((row) => row.limit > 0 || row.spent > 0))
const deltaText = computed(() => {
  if (!previous.value.hasData) return '上月没有记录'
  const diff = figures.value.expense - previous.value.expense
  if (diff === 0) return '支出与上月持平'
  if (diff > 0) return `支出比上月多 ${formatCents(diff)}`
  return `支出比上月少 ${formatCents(-diff)}`
})
</script>

<template>
  <PageHeader title="月度一览" lede="这个月花在哪、比上月多还是少、有没有超出预算。">
    <RouterLink class="btn" to="/ledger">去记账</RouterLink>
  </PageHeader>
  <div class="stack">
    <MonthSwitcher :model-value="store.activeMonth" @update:model-value="store.setActiveMonth" />
    <template v-if="figures.hasData">
      <section class="stats">
        <article class="card stat">
          <span>收入</span>
          <strong class="pos">{{ formatCents(figures.income) }}</strong>
        </article>
        <article class="card stat">
          <span>支出</span>
          <strong class="neg">{{ formatCents(figures.expense) }}</strong>
        </article>
        <article class="card stat">
          <span>结余</span>
          <strong data-testid="month-balance" :class="figures.balance < 0 ? 'neg' : 'pos'">{{ formatCents(figures.balance) }}</strong>
        </article>
        <article class="card stat">
          <span>较上月</span>
          <strong class="sentence">{{ deltaText }}</strong>
        </article>
      </section>
      <section class="grid-2">
        <article class="card">
          <h2>{{ formatMonthLabel(store.activeMonth) }}的支出</h2>
          <CategoryBars
            v-if="breakdown.length"
            :items="breakdown.map((item) => ({ id: item.id, label: item.name, value: item.amount, max: maxShare }))"
          />
          <p v-else class="lede">这个月还没有支出。</p>
        </article>
        <article class="card">
          <h2>当月预算</h2>
          <CategoryBars
            v-if="progress.plan && budgetRows.length"
            :items="budgetRows.map((row) => ({
              id: row.id,
              label: row.name,
              value: row.spent,
              max: row.limit > 0 ? Math.max(row.limit, row.spent) : row.spent,
              tone: row.limit > 0 && row.spent > row.limit ? 'red' : 'green',
              hint: row.limit > 0 ? `${formatCents(row.spent)} / ${formatCents(row.limit)}` : `${formatCents(row.spent)} · 未设预算`,
            }))"
          />
          <EmptyState v-else title="今年还没有预算" text="先给常花的分类一个上限，这里才能对照。" action="去写计划" to="/plan" />
        </article>
      </section>
    </template>
    <EmptyState v-else title="这个月还没有收支" text="记一笔之后，分类占比和预算对照会出现在这里。" action="去记账" to="/ledger" />
  </div>
</template>
