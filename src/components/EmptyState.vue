<script setup lang="ts">
defineProps<{ title: string; text?: string; action?: string; to?: string }>()
</script>

<template>
  <div class="empty">
    <h2>{{ title }}</h2>
    <p v-if="text" class="lede">{{ text }}</p>
    <router-link v-if="action && to" class="btn primary" :to="to">{{ action }}</router-link>
    <slot />
  </div>
</template>
