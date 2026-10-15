<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import CategoryBars from '../components/CategoryBars.vue'
import EmptyState from '../components/EmptyState.vue'
import MonthSwitcher from '../components/MonthSwitcher.vue'
import PageHeader from '../components/PageHeader.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { getPlanProgress, getYearFigures, goalPace } from '../domain/stats'
import { useAppStore } from '../stores/app'
import { formatMonthLabel } from '../utils/date'
import { formatCents } from '../utils/money'

const store = useAppStore()
const progress = computed(() => getPlanProgress(store.data, store.activeMonth))
const year = computed(() => Number(store.activeMonth.slice(0, 4)))
const yearFigures = computed(() => getYearFigures(store.data, year.value))
const budgetRows = computed(() => progress.value.rows.filter((row) => row.limit > 0 || row.spent > 0))
const goals = computed(() => store.data.goals.filter((goal) => goal.status !== 'paused'))
const saveRatio = computed(() => {
  if (progress.value.target <= 0) return 0
  return Math.max(0, progress.value.figures.balance) / progress.value.target
})
</script>

<template>
  <PageHeader title="完成进度" lede="计划有没有做到，目标有没有跟上截止日期。" />
  <div class="stack">
    <MonthSwitcher :model-value="store.activeMonth" @update:model-value="store.setActiveMonth" />

    <article class="card">
      <h2>计划执行 · {{ formatMonthLabel(store.activeMonth) }}</h2>
      <template v-if="progress.plan">
        <p>
          实存（本月结余）
          <strong data-testid="progress-actual">{{ formatCents(progress.figures.balance) }}</strong>
          / 应存 {{ formatCents(progress.target) }}
        </p>
        <ProgressBar :value="saveRatio" :tone="progress.figures.balance < progress.target ? 'red' : 'green'" />
        <p class="lede">
          {{ year }} 年累计结余 {{ formatCents(yearFigures.balance) }} / 全年应存
          {{ formatCents(progress.target * 12) }}
        </p>
        <CategoryBars
          v-if="budgetRows.length"
          :items="budgetRows.map((row) => ({
            id: row.id,
            label: row.name,
            value: row.spent,
            max: row.limit > 0 ? Math.max(row.limit, row.spent) : row.spent,
            tone: row.limit > 0 && row.spent > row.limit ? 'red' : 'green',
            hint: row.limit > 0 ? `${formatCents(row.spent)} / ${formatCents(row.limit)}` : `${formatCents(row.spent)} · 未设预算`,
          }))"
        />
        <p v-if="progress.plan.note" class="lede">{{ progress.plan.note }}</p>
      </template>
      <EmptyState v-else title="这一年还没有计划" text="写上每月应存和分类预算后，这里会显示做到了多少。" action="去写计划" to="/plan" />
    </article>

    <article class="card">
      <h2>目标进度</h2>
      <div v-if="goals.length" class="stack">
        <section v-for="goal in goals" :key="goal.id">
          <div class="goal-top">
            <strong>{{ goal.name }}</strong>
            <span>{{ formatCents(goal.savedAmount) }} / {{ formatCents(goal.targetAmount) }}</span>
          </div>
          <ProgressBar
            :value="goal.targetAmount ? goal.savedAmount / goal.targetAmount : 0"
            :marker="goalPace(goal)?.expected ?? null"
          />
          <p class="lede">
            <template v-if="goalPace(goal)?.overdue">已过截止日期，还差 {{ formatCents(Math.max(0, goal.targetAmount - goal.savedAmount)) }}。</template>
            <template v-else-if="goalPace(goal)">
              按截止日期应达到 {{ Math.round((goalPace(goal)?.expected ?? 0) * 100) }}%，实际
              {{ Math.round((goal.savedAmount / goal.targetAmount) * 100) }}%。
            </template>
          </p>
        </section>
      </div>
      <EmptyState v-else title="没有要追踪的目标" text="暂停的目标不出现在这里。" action="去定目标" to="/goals" />
      <p class="lede">条上的黑线是按截止日期算出的应达比例。</p>
      <RouterLink to="/goals">管理目标</RouterLink>
    </article>
  </div>
</template>
