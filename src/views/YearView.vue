<script setup lang="ts">
import { computed, ref } from 'vue'
import CategoryBars from '../components/CategoryBars.vue'
import EmptyState from '../components/EmptyState.vue'
import PageHeader from '../components/PageHeader.vue'
import YearSwitcher from '../components/YearSwitcher.vue'
import { expenseBreakdown, getYearFigures } from '../domain/stats'
import { useAppStore } from '../stores/app'
import { formatMonthLabel } from '../utils/date'
import { formatCents } from '../utils/money'

const store = useAppStore()
const year = ref(new Date().getFullYear())
const figures = computed(() => getYearFigures(store.data, year.value))
const hasAny = computed(() => figures.value.months.some((month) => month.hasData))
const breakdown = computed(() => expenseBreakdown(store.data, figures.value.byCategory))
const maxBar = computed(() => Math.max(1, ...figures.value.months.flatMap((month) => [month.income, month.expense])))

function barWidth(amount: number) {
  return `${Math.round((amount / maxBar.value) * 100)}%`
}
</script>

<template>
  <PageHeader title="年度一览" lede="十二个月放在一起，才看得出哪些月真的省下来了。" />
  <div class="stack">
    <YearSwitcher v-model="year" />
    <template v-if="hasAny">
      <section class="stats">
        <article class="card stat">
          <span>全年收入</span>
          <strong class="pos">{{ formatCents(figures.income) }}</strong>
        </article>
        <article class="card stat">
          <span>全年支出</span>
          <strong class="neg">{{ formatCents(figures.expense) }}</strong>
        </article>
        <article class="card stat">
          <span>全年结余</span>
          <strong data-testid="year-balance" :class="figures.balance < 0 ? 'neg' : 'pos'">{{ formatCents(figures.balance) }}</strong>
        </article>
      </section>
      <section v-if="figures.best && figures.worst && figures.best.month !== figures.worst.month" class="stats">
        <article class="card stat">
          <span>结余最高</span>
          <strong class="pos">{{ formatCents(figures.best.balance) }}</strong>
          <em>{{ formatMonthLabel(figures.best.month) }}</em>
        </article>
        <article class="card stat">
          <span>结余最低</span>
          <strong :class="figures.worst.balance < 0 ? 'neg' : 'pos'">{{ formatCents(figures.worst.balance) }}</strong>
          <em>{{ formatMonthLabel(figures.worst.month) }}</em>
        </article>
      </section>
      <article class="card">
        <div class="goal-top">
          <h2>{{ year }} 年各月</h2>
          <p class="legend"><span><i class="in" />收入</span><span><i class="out" />支出</span></p>
        </div>
        <ol class="year-list">
          <li v-for="month in figures.months" :key="month.month" :class="{ quiet: !month.hasData }">
            <strong>{{ Number(month.month.slice(5)) }}月</strong>
            <span>{{ month.hasData ? formatCents(month.income) : '—' }}</span>
            <span>{{ month.hasData ? formatCents(month.expense) : '—' }}</span>
            <span :class="month.hasData && month.balance < 0 ? 'neg' : ''">{{ month.hasData ? formatCents(month.balance) : '—' }}</span>
            <div class="year-bars" aria-hidden="true">
              <i class="in" :style="{ width: barWidth(month.income) }" />
              <i class="out" :style="{ width: barWidth(month.expense) }" />
            </div>
          </li>
        </ol>
      </article>
      <article v-if="breakdown.length" class="card">
        <h2>全年支出分类</h2>
        <CategoryBars
          :items="breakdown.map((item) => ({ id: item.id, label: item.name, value: item.amount, max: breakdown[0]?.amount ?? 1 }))"
        />
      </article>
    </template>
    <EmptyState v-else title="这一年还没有账" text="有流水或归档快照之后，十二个月的表会自己长出来。" action="去记账" to="/ledger" />
  </div>
</template>
