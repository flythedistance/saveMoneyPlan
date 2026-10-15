<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import Modal from '../components/Modal.vue'
import MonthSwitcher from '../components/MonthSwitcher.vue'
import PageHeader from '../components/PageHeader.vue'
import { categoryName, getMonthFigures } from '../domain/stats'
import { useAppStore } from '../stores/app'
import type { FlowType, Transaction } from '../types'
import { formatDateLabel, formatMonthLabel, todayString } from '../utils/date'
import { centsToYuanInput, formatCents, formatSignedCents, parseYuanToCents } from '../utils/money'

const store = useAppStore()
const typeFilter = ref<'all' | FlowType>('all')
const formOpen = ref(false)
const editingId = ref('')
const deletingId = ref('')
const formError = ref('')
const form = reactive({
  type: 'expense' as FlowType,
  amount: '',
  categoryId: 'exp-food',
  date: todayString(),
  note: '',
})

const figures = computed(() => getMonthFigures(store.data, store.activeMonth))
const categories = computed(() => store.data.categories.filter((item) => item.type === form.type))
const rows = computed(() =>
  store.data.transactions
    .filter((item) => item.date.startsWith(store.activeMonth))
    .filter((item) => typeFilter.value === 'all' || item.type === typeFilter.value)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
)
const grouped = computed(() => {
  const map = new Map<string, Transaction[]>()
  for (const row of rows.value) {
    const list = map.get(row.date) ?? []
    list.push(row)
    map.set(row.date, list)
  }
  return [...map.entries()]
})

function defaultDate() {
  return store.activeMonth === todayString().slice(0, 7) ? todayString() : `${store.activeMonth}-01`
}

function setType(type: FlowType) {
  form.type = type
  if (!categories.value.some((item) => item.id === form.categoryId)) {
    form.categoryId = categories.value[0]?.id ?? ''
  }
}

function openCreate() {
  editingId.value = ''
  form.type = 'expense'
  form.amount = ''
  form.categoryId = 'exp-food'
  form.date = defaultDate()
  form.note = ''
  formError.value = ''
  formOpen.value = true
}

function openEdit(item: Transaction) {
  editingId.value = item.id
  form.type = item.type
  form.amount = centsToYuanInput(item.amount)
  form.categoryId = item.categoryId
  form.date = item.date
  form.note = item.note
  formError.value = ''
  formOpen.value = true
}

function save() {
  const amount = parseYuanToCents(form.amount)
  if (amount == null) {
    formError.value = '请输入大于 0 的金额，最多两位小数。'
    return
  }
  if (!form.date || !form.categoryId) {
    formError.value = '请选择日期和分类。'
    return
  }
  store.saveTransaction({
    id: editingId.value || undefined,
    type: form.type,
    amount,
    categoryId: form.categoryId,
    date: form.date,
    note: form.note,
  })
  store.setActiveMonth(form.date.slice(0, 7))
  formOpen.value = false
}
</script>

<template>
  <PageHeader title="记账" lede="收入和支出都记在这里，月度表和年度表会跟着变。">
    <button type="button" class="btn primary" data-testid="add-transaction" @click="openCreate">记一笔</button>
  </PageHeader>

  <div class="stack">
    <div class="split">
      <MonthSwitcher :model-value="store.activeMonth" @update:model-value="store.setActiveMonth" />
      <div class="segmented" aria-label="筛选收支">
        <button type="button" :aria-pressed="typeFilter === 'all'" @click="typeFilter = 'all'">全部</button>
        <button type="button" :aria-pressed="typeFilter === 'expense'" @click="typeFilter = 'expense'">支出</button>
        <button type="button" :aria-pressed="typeFilter === 'income'" @click="typeFilter = 'income'">收入</button>
      </div>
    </div>

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
        <strong data-testid="ledger-balance" :class="figures.balance < 0 ? 'neg' : 'pos'">{{ formatCents(figures.balance) }}</strong>
      </article>
    </section>

    <p v-if="figures.fromSnapshot" class="note">
      {{ formatMonthLabel(store.activeMonth) }}有已归档合计：收入 {{ formatCents(figures.snapshotIncome) }}，支出
      {{ formatCents(figures.snapshotExpense) }}。下面只显示还留着的明细，新记账会加到合计上。
    </p>

    <section v-if="grouped.length" class="card">
      <template v-for="[date, items] in grouped" :key="date">
        <h2 class="day-label">{{ formatDateLabel(date) }}</h2>
        <div v-for="item in items" :key="item.id" class="tx-row">
          <button type="button" class="tx-main" @click="openEdit(item)">
            <span>{{ categoryName(store.data.categories, item.categoryId) }}</span>
            <span class="note">{{ item.note || '无备注' }}</span>
            <span class="money" :class="item.type">{{ formatSignedCents(item.amount, item.type) }}</span>
          </button>
          <button type="button" class="btn danger ghost" @click="deletingId = item.id">删除</button>
        </div>
      </template>
    </section>
    <EmptyState
      v-else
      :title="figures.fromSnapshot ? '这个月的明细已经归档' : '这个月还没有账'"
      text="记一笔之后，可以按日期回来改。"
    >
      <button type="button" class="btn primary" @click="openCreate">记一笔</button>
    </EmptyState>
  </div>

  <Modal :open="formOpen" :title="editingId ? '修改这一笔' : '记一笔'" @close="formOpen = false">
    <form class="form-grid" @submit.prevent="save">
      <div class="segmented">
        <button type="button" :aria-pressed="form.type === 'expense'" @click="setType('expense')">支出</button>
        <button type="button" :aria-pressed="form.type === 'income'" @click="setType('income')">收入</button>
      </div>
      <label class="field">
        <span>金额（元）</span>
        <input v-model="form.amount" data-testid="tx-amount" inputmode="decimal" autocomplete="off" placeholder="0.00" />
      </label>
      <label class="field">
        <span>分类</span>
        <select v-model="form.categoryId" data-testid="tx-category">
          <option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </label>
      <label class="field">
        <span>日期</span>
        <input v-model="form.date" data-testid="tx-date" type="date" required />
      </label>
      <label class="field">
        <span>备注</span>
        <input v-model="form.note" maxlength="80" placeholder="可留空" />
      </label>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="form-actions">
        <button v-if="editingId" type="button" class="btn danger ghost" @click="deletingId = editingId">删除</button>
        <button type="submit" class="btn primary" data-testid="save-transaction">保存</button>
      </div>
    </form>
  </Modal>

  <Modal :open="Boolean(deletingId)" title="删除这笔账？" @close="deletingId = ''">
    <p>删除后，月度和年度合计会马上重算。</p>
    <div class="form-actions">
      <button type="button" class="btn" @click="deletingId = ''">取消</button>
      <button
        type="button"
        class="btn danger"
        @click="store.removeTransaction(deletingId); deletingId = ''; formOpen = false"
      >
        删除
      </button>
    </div>
  </Modal>
</template>
