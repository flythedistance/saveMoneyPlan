<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from './components/AppShell.vue'

const route = useRoute()

watch(
  () => route.meta.title,
  (title) => {
    document.title = title ? `${title} · 省钱计划` : '省钱计划'
  },
  { immediate: true },
)
</script>

<template>
  <AppShell>
    <router-view />
  </AppShell>
</template>
