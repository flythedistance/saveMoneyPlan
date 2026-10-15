<script setup lang="ts">
defineProps<{ title: string; lede: string }>()
</script>

<template>
  <header class="page-head">
    <div>
      <h1>{{ title }}</h1>
      <p>{{ lede }}</p>
    </div>
    <slot />
  </header>
</template>
