<script setup lang="ts">
import { computed, ref } from 'vue'
import Modal from '../components/Modal.vue'
import PageHeader from '../components/PageHeader.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { useAppStore } from '../stores/app'
import { SOFT_LIMIT_BYTES } from '../storage/local'
import { formatMonthLabel, todayString } from '../utils/date'
import { formatBytes } from '../utils/money'

const store = useAppStore()
const fileInput = ref<HTMLInputElement | null>(null)
const pendingText = ref('')
const confirmOpen = ref(false)
const importError = ref('')
const importOk = ref(false)
const retention = ref(String(store.data.settings.retentionMonths))
const retentionError = ref('')

function hasUserData() {
  const data = store.data
  return data.transactions.length + data.goals.length + data.books.length + data.snapshots.length + data.plans.length > 0
}

function exportJson() {
  const blob = new Blob([JSON.stringify(store.data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `save-money-plan-${todayString()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function applyImport(text: string) {
  const message = store.importData(text)
  importError.value = message ?? ''
  importOk.value = message == null
  confirmOpen.value = false
  pendingText.value = ''
  retention.value = String(store.data.settings.retentionMonths)
}

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const text = String(reader.result ?? '')
    if (hasUserData()) {
      pendingText.value = text
      confirmOpen.value = true
      return
    }
    applyImport(text)
  }
  reader.readAsText(file)
}

function applyRetention() {
  const value = Number(retention.value)
  if (!Number.isInteger(value) || value < 1 || value > 120) {
    retentionError.value = '保留月数请填 1 到 120 的整数。'
    return
  }
  store.setRetentionMonths(value)
  retentionError.value = ''
}

const cleanup = computed(() => store.data.settings.lastCleanup)
const usageRatio = computed(() => store.storageBytes / SOFT_LIMIT_BYTES)
</script>

<template>
  <PageHeader title="设置" lede="数据只在这台浏览器里。换浏览器或清站点数据之前，先导出一份。" />
  <div class="stack">
    <section class="card stack">
      <h2>本地存储</h2>
      <p>
        {{ formatBytes(store.storageBytes) }} · 流水 {{ store.data.transactions.length }} 条 · 快照
        {{ store.data.snapshots.length }} 个月 · 书籍 {{ store.data.books.length }} 本
      </p>
      <ProgressBar :value="usageRatio" :tone="usageRatio > 0.85 ? 'red' : 'green'" />
      <p class="lede">
        明细默认保留一段时间。超过约 3.5MB，或超过你设置的保留月数时，会从最早的月份开始把流水收成月度快照。目标、计划、书籍和已经生成的快照不会删。至少会留下最近两个月的明细。
      </p>
      <label class="field">
        <span>保留明细月数</span>
        <input v-model="retention" inputmode="numeric" />
      </label>
      <p v-if="retentionError" class="form-error">{{ retentionError }}</p>
      <p v-if="cleanup" class="lede">
        最近一次归档：
        {{ formatMonthLabel(cleanup.from) }}
        <template v-if="cleanup.from !== cleanup.to">至 {{ formatMonthLabel(cleanup.to) }}</template>
      </p>
      <div class="actions">
        <button type="button" class="btn" @click="applyRetention">应用保留月数</button>
      </div>
    </section>

    <section class="card stack">
      <h2>备份</h2>
      <p class="lede">导出的 JSON 可以再导回来。导入会替换当前这台浏览器里的数据。</p>
      <div class="actions">
        <button type="button" class="btn primary" @click="exportJson">导出 JSON</button>
        <button type="button" class="btn" @click="fileInput?.click()">导入 JSON</button>
      </div>
      <input ref="fileInput" class="sr-only" type="file" accept="application/json,.json" @change="onFile" />
      <p v-if="importError" class="form-error">{{ importError }}</p>
      <p v-else-if="importOk" class="note">导入完成。</p>
    </section>
  </div>

  <Modal :open="confirmOpen" title="用备份替换当前数据？" @close="confirmOpen = false">
    <p>这会覆盖现在的流水、目标、计划和书单。</p>
    <div class="form-actions">
      <button type="button" class="btn" @click="confirmOpen = false">取消</button>
      <button type="button" class="btn primary" @click="applyImport(pendingText)">替换并导入</button>
    </div>
  </Modal>
</template>
