<script setup lang="ts">
import { useAppStore } from '../stores/app'

const store = useAppStore()

const items = [
  { to: '/', id: 'home', label: '首页' },
  { to: '/ledger', id: 'ledger', label: '记账' },
  { to: '/month', id: 'month', label: '月度' },
  { to: '/year', id: 'year', label: '年度' },
  { to: '/reading', id: 'reading', label: '阅读' },
  { to: '/goals', id: 'goals', label: '目标' },
  { to: '/plan', id: 'plan', label: '计划' },
  { to: '/progress', id: 'progress', label: '进度' },
  { to: '/advice', id: 'advice', label: '建议' },
  { to: '/settings', id: 'settings', label: '设置' },
]
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <router-link to="/" class="brand">
        <span class="mark">省</span>
        <span>
          <strong>省钱计划</strong>
          <small>记在这台浏览器里</small>
        </span>
      </router-link>
      <nav class="nav-list" aria-label="主导航">
        <router-link
          v-for="item in items"
          :key="item.id"
          :to="item.to"
          exact-active-class="is-active"
          :data-testid="`nav-${item.id}`"
        >
          {{ item.label }}
        </router-link>
      </nav>
    </aside>
    <div class="workspace">
      <div v-if="store.persistError" class="banner danger workspace-banner" role="status">
        <p>{{ store.persistError }}</p>
      </div>
      <main>
        <slot />
      </main>
    </div>
    <nav class="bottom-nav" aria-label="底部导航">
      <router-link
        v-for="item in items"
        :key="item.id"
        :to="item.to"
        exact-active-class="is-active"
      >
        {{ item.label }}
      </router-link>
    </nav>
  </div>
</template>
