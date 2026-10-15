<script setup lang="ts">
import { computed } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import MonthSwitcher from '../components/MonthSwitcher.vue'
import PageHeader from '../components/PageHeader.vue'
import { buildSuggestions } from '../domain/suggestions'
import { useAppStore } from '../stores/app'
import { formatMonthLabel } from '../utils/date'

const store = useAppStore()
const suggestions = computed(() => buildSuggestions(store.data, store.activeMonth))
</script>

<template>
  <PageHeader title="建议" :lede="`按${formatMonthLabel(store.activeMonth)}的账、预算和目标，挑出值得处理的事。`" />
  <div class="stack">
    <MonthSwitcher :model-value="store.activeMonth" @update:model-value="store.setActiveMonth" />
    <section v-if="suggestions.length" class="stack" data-testid="advice-list">
      <article v-for="item in suggestions" :key="item.id" class="card suggestion" :class="item.severity">
        <p class="eyebrow">{{ item.severity === 'high' ? '优先处理' : item.severity === 'medium' ? '可以看看' : '顺手做' }}</p>
        <h2>{{ item.title }}</h2>
        <p>{{ item.detail }}</p>
      </article>
    </section>
    <EmptyState
      v-else
      title="这个月暂没有需要处理的问题"
      text="记了账、写了计划和目标之后，超支、进度落后和想借的书会出现在这里。"
      action="去记账"
      to="/ledger"
    />
  </div>
</template>
