<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import CategoryBars from '../components/CategoryBars.vue'
import EmptyState from '../components/EmptyState.vue'
import MonthSwitcher from '../components/MonthSwitcher.vue'
import PageHeader from '../components/PageHeader.vue'
import { buildSuggestions } from '../domain/suggestions'
import { categoryName, expenseBreakdown, getPlanProgress, goalSummary } from '../domain/stats'
import { useAppStore } from '../stores/app'
import { formatMonthLabel } from '../utils/date'
import { formatCents, formatSignedCents } from '../utils/money'

const store = useAppStore()

const progress = computed(() => getPlanProgress(store.data, store.activeMonth))
const summary = computed(() => goalSummary(store.data.goals))
const top = computed(() => buildSuggestions(store.data, store.activeMonth)[0] ?? null)
const recent = computed(() =>
  store.data.transactions
    .filter((item) => item.date.startsWith(store.activeMonth))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .slice(0, 5),
)
const breakdown = computed(() => expenseBreakdown(store.data, progress.value.figures.byCategory))
const showGuide = computed(
  () => store.data.transactions.length === 0 && store.data.goals.length === 0 && store.data.plans.length === 0 && store.data.snapshots.length === 0,
)
const showCleanup = computed(() => {
  const record = store.data.settings.lastCleanup
  if (!record) return false
  return store.data.settings.cleanupNoticeSeenAt !== record.at
})
const cleanupText = computed(() => {
  const record = store.data.settings.lastCleanup
  if (!record) return ''
  const from = formatMonthLabel(record.from)
  const to = formatMonthLabel(record.to)
  const range = record.from === record.to ? from : `${from}至${to}`
  return `已归档${range}的明细。这些月份的合计还留在月度快照里，年度一览不会因此变空。`
})
const balance = computed(() => progress.value.figures.balance)
</script>

<template>
  <PageHeader title="首页" :lede="`${formatMonthLabel(store.activeMonth)}的收支、目标和最需要处理的一件事。`">
    <RouterLink class="btn primary" to="/ledger">记一笔</RouterLink>
  </PageHeader>

  <div class="stack">
    <MonthSwitcher :model-value="store.activeMonth" @update:model-value="store.setActiveMonth" />

    <section v-if="showCleanup" class="banner">
      <p>{{ cleanupText }}</p>
      <button type="button" class="btn" @click="store.dismissCleanup()">知道了</button>
    </section>

    <section v-if="showGuide" class="card">
      <h2>从记一笔开始</h2>
      <ol class="steps">
        <li>
          <RouterLink to="/ledger">记账</RouterLink>
          <p>先有收支，月度表和年度表才算得出来。</p>
        </li>
        <li>
          <RouterLink to="/plan">省钱计划</RouterLink>
          <p>给每个月一个应存金额，再给常花的分类一个上限。</p>
        </li>
        <li>
          <RouterLink to="/goals">省钱目标</RouterLink>
          <p>把结余放进具体的目标里，进度才有对照。</p>
        </li>
      </ol>
    </section>

    <section class="stats">
      <article class="card stat">
        <span>收入</span>
        <strong class="pos">{{ formatCents(progress.figures.income) }}</strong>
      </article>
      <article class="card stat">
        <span>支出</span>
        <strong class="neg">{{ formatCents(progress.figures.expense) }}</strong>
      </article>
      <article class="card stat">
        <span>结余</span>
        <strong data-testid="home-balance" :class="balance < 0 ? 'neg' : 'pos'">{{ formatCents(balance) }}</strong>
      </article>
      <article class="card stat">
        <span>预算剩余</span>
        <strong v-if="progress.plan && progress.budgetLimit > 0" :class="progress.budgetRemaining < 0 ? 'neg' : 'pos'">
          {{ formatCents(progress.budgetRemaining) }}
        </strong>
        <strong v-else class="muted">未设置</strong>
      </article>
    </section>

    <section class="grid-2">
      <article class="card">
        <p class="eyebrow">进行中的目标</p>
        <h2 v-if="summary.activeCount">已完成 {{ Math.round(summary.ratio * 100) }}%</h2>
        <h2 v-else>还没有进行中的目标</h2>
        <p v-if="summary.activeCount" class="lede">
          {{ formatCents(summary.saved) }} / {{ formatCents(summary.target) }}
        </p>
        <RouterLink class="btn" to="/goals">{{ summary.activeCount ? '查看目标' : '去制定目标' }}</RouterLink>
      </article>
      <article class="card suggestion" :class="top?.severity ?? 'low'">
        <p class="eyebrow">建议</p>
        <h2>{{ top?.title ?? '这个月暂没有需要处理的问题' }}</h2>
        <p>{{ top?.detail ?? '继续记账，预算和目标会在这里提醒你。' }}</p>
        <RouterLink to="/advice">查看全部建议</RouterLink>
      </article>
    </section>

    <section v-if="breakdown.length" class="card">
      <h2>支出去向</h2>
      <CategoryBars
        :items="breakdown.map((item) => ({ id: item.id, label: item.name, value: item.amount, max: breakdown[0]?.amount ?? 1 }))"
      />
    </section>

    <section v-if="recent.length" class="card">
      <h2>这个月最近的账</h2>
      <ul class="tx-list">
        <li v-for="item in recent" :key="item.id" class="tx-row">
          <div class="tx-main">
            <span>{{ categoryName(store.data.categories, item.categoryId) }}</span>
            <span class="note">{{ item.note || '无备注' }}</span>
            <span class="money" :class="item.type">{{ formatSignedCents(item.amount, item.type) }}</span>
          </div>
        </li>
      </ul>
    </section>
    <EmptyState
      v-else-if="!showGuide && !progress.figures.hasData"
      title="这个月还没有账"
      text="记下一笔收入或支出，首页的数字就会动起来。"
      action="去记账"
      to="/ledger"
    />
  </div>
</template>
