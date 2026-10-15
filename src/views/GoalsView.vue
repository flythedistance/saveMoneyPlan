<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import Modal from '../components/Modal.vue'
import MonthSwitcher from '../components/MonthSwitcher.vue'
import PageHeader from '../components/PageHeader.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { goalPace, monthAllocation } from '../domain/stats'
import { useAppStore } from '../stores/app'
import type { Goal, GoalStatus } from '../types'
import { formatMonthLabel, todayString } from '../utils/date'
import { centsToYuanInput, formatCents, parseYuanToCents } from '../utils/money'

const store = useAppStore()
const formOpen = ref(false)
const editingId = ref('')
const depositId = ref('')
const allocateId = ref('')
const deletingId = ref('')
const formError = ref('')
const depositAmount = ref('')
const depositError = ref('')
const form = reactive({
  name: '',
  amount: '',
  deadline: `${new Date().getFullYear()}-12-31`,
  note: '',
})

const allocation = computed(() => monthAllocation(store.data, store.activeMonth))
const goals = computed(() => {
  const rank: Record<GoalStatus, number> = { active: 0, paused: 1, done: 2 }
  return store.data.goals.slice().sort((a, b) => rank[a.status] - rank[b.status] || a.deadline.localeCompare(b.deadline))
})
const allocateGoal = computed(() => goals.value.find((goal) => goal.id === allocateId.value) ?? null)
const depositGoal = computed(() => goals.value.find((goal) => goal.id === depositId.value) ?? null)

function openCreate() {
  editingId.value = ''
  form.name = ''
  form.amount = ''
  form.deadline = `${todayString().slice(0, 4)}-12-31`
  form.note = ''
  formError.value = ''
  formOpen.value = true
}

function openEdit(goal: Goal) {
  editingId.value = goal.id
  form.name = goal.name
  form.amount = centsToYuanInput(goal.targetAmount)
  form.deadline = goal.deadline
  form.note = goal.note
  formError.value = ''
  formOpen.value = true
}

function save() {
  const amount = parseYuanToCents(form.amount)
  if (!form.name.trim() || amount == null || !form.deadline) {
    formError.value = '请填写名称、大于 0 的目标金额和截止日期。'
    return
  }
  store.saveGoal({
    id: editingId.value || undefined,
    name: form.name,
    targetAmount: amount,
    deadline: form.deadline,
    note: form.note,
  })
  formOpen.value = false
}

function openDeposit(id: string) {
  depositId.value = id
  depositAmount.value = ''
  depositError.value = ''
}

function saveDeposit() {
  const amount = parseYuanToCents(depositAmount.value)
  if (amount == null) {
    depositError.value = '请输入大于 0 的存入金额。'
    return
  }
  store.depositToGoal(depositId.value, amount)
  depositId.value = ''
}

function paceText(goal: Goal) {
  const pace = goalPace(goal)
  if (!pace) return '还没法按截止日期估算进度。'
  if (pace.overdue) return `已过截止日期，还差 ${formatCents(Math.max(0, goal.targetAmount - goal.savedAmount))}。`
  return `按截止日期应达到 ${Math.round(pace.expected * 100)}%，实际 ${Math.round(pace.actual * 100)}%。`
}
</script>

<template>
  <PageHeader title="省钱目标" lede="给存下来的钱一个去处。已存金额只在你点「存入」或「记入结余」时增加。">
    <button type="button" class="btn primary" data-testid="add-goal" @click="openCreate">新建目标</button>
  </PageHeader>
  <div class="stack">
    <MonthSwitcher :model-value="store.activeMonth" @update:model-value="store.setActiveMonth" />
    <p class="note">
      {{ formatMonthLabel(store.activeMonth) }}还可记入
      {{ formatCents(Math.max(0, allocation.remaining)) }}。多个目标不会自动分这笔结余。
    </p>
    <section v-if="goals.length" class="stack">
      <article v-for="goal in goals" :key="goal.id" class="card goal-card">
        <div class="goal-top">
          <h2>{{ goal.name }}</h2>
          <span class="pill" :class="goal.status === 'done' ? 'done' : goal.status === 'paused' ? 'paused' : ''">
            {{ goal.status === 'active' ? '进行中' : goal.status === 'paused' ? '已暂停' : '已完成' }}
          </span>
        </div>
        <p data-testid="goal-saved">{{ formatCents(goal.savedAmount) }} / {{ formatCents(goal.targetAmount) }}</p>
        <ProgressBar :value="goal.savedAmount / goal.targetAmount" :marker="goalPace(goal)?.expected ?? null" />
        <p>{{ paceText(goal) }}</p>
        <p v-if="goal.note">{{ goal.note }}</p>
        <div class="actions">
          <button type="button" class="btn" data-testid="deposit-goal" @click="openDeposit(goal.id)">存入</button>
          <button
            v-if="goal.status === 'active'"
            type="button"
            class="btn"
            :disabled="allocation.remaining <= 0"
            @click="allocateId = goal.id"
          >
            记入结余
          </button>
          <button type="button" class="btn" @click="openEdit(goal)">编辑</button>
          <button v-if="goal.status === 'active'" type="button" class="btn" @click="store.setGoalStatus(goal.id, 'paused')">暂停</button>
          <button v-else-if="goal.status === 'paused'" type="button" class="btn" @click="store.setGoalStatus(goal.id, 'active')">继续</button>
          <button v-else type="button" class="btn" @click="store.setGoalStatus(goal.id, 'active')">重新开始</button>
          <button v-if="goal.status !== 'done'" type="button" class="btn" @click="store.setGoalStatus(goal.id, 'done')">完成</button>
          <button type="button" class="btn danger ghost" @click="deletingId = goal.id">删除</button>
        </div>
      </article>
    </section>
    <EmptyState v-else title="还没有目标" text="比如旅行、应急金，或一件想买但先不买的东西。" />
  </div>

  <Modal :open="formOpen" :title="editingId ? '修改目标' : '新建目标'" @close="formOpen = false">
    <form class="form-grid" @submit.prevent="save">
      <label class="field">
        <span>名称</span>
        <input v-model="form.name" data-testid="goal-name" maxlength="40" />
      </label>
      <label class="field">
        <span>目标金额（元）</span>
        <input v-model="form.amount" data-testid="goal-amount" inputmode="decimal" placeholder="0.00" />
      </label>
      <label class="field">
        <span>截止日期</span>
        <input v-model="form.deadline" data-testid="goal-deadline" type="date" required />
      </label>
      <label class="field">
        <span>备注</span>
        <textarea v-model="form.note" maxlength="200" />
      </label>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="form-actions">
        <button type="submit" class="btn primary" data-testid="save-goal">保存</button>
      </div>
    </form>
  </Modal>

  <Modal :open="Boolean(depositGoal)" :title="depositGoal ? `存入「${depositGoal.name}」` : '存入'" @close="depositId = ''">
    <form class="form-grid" @submit.prevent="saveDeposit">
      <label class="field">
        <span>金额（元）</span>
        <input v-model="depositAmount" data-testid="deposit-amount" inputmode="decimal" placeholder="0.00" />
      </label>
      <p v-if="depositError" class="form-error">{{ depositError }}</p>
      <div class="form-actions">
        <button type="submit" class="btn primary" data-testid="confirm-deposit">确认存入</button>
      </div>
    </form>
  </Modal>

  <Modal :open="Boolean(allocateGoal)" title="记入本月结余" @close="allocateId = ''">
    <p v-if="allocateGoal">
      把{{ formatMonthLabel(store.activeMonth) }}尚未记入目标的结余
      {{ formatCents(allocation.remaining) }}放进「{{ allocateGoal.name }}」。
    </p>
    <div class="form-actions">
      <button type="button" class="btn" @click="allocateId = ''">取消</button>
      <button type="button" class="btn primary" @click="store.allocateBalance(allocateId, store.activeMonth); allocateId = ''">
        确认记入
      </button>
    </div>
  </Modal>

  <Modal :open="Boolean(deletingId)" title="删除这个目标？" @close="deletingId = ''">
    <p>已经记入这个目标的结余会释放出来，可以再记入别的目标。</p>
    <div class="form-actions">
      <button type="button" class="btn" @click="deletingId = ''">取消</button>
      <button type="button" class="btn danger" @click="store.removeGoal(deletingId); deletingId = ''">删除</button>
    </div>
  </Modal>
</template>
