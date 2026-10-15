<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import EmptyState from '../components/EmptyState.vue'
import Modal from '../components/Modal.vue'
import PageHeader from '../components/PageHeader.vue'
import YearSwitcher from '../components/YearSwitcher.vue'
import { bookSavedAmount, getReadingStats } from '../domain/stats'
import { useAppStore } from '../stores/app'
import type { Book, BookSource, BookStatus } from '../types'
import { todayString } from '../utils/date'
import { centsToYuanInput, formatCents, parseYuanToCents } from '../utils/money'

const store = useAppStore()
const year = ref(new Date().getFullYear())
const filter = ref<'all' | BookStatus>('all')
const formOpen = ref(false)
const editingId = ref('')
const deletingId = ref('')
const formError = ref('')
const statusLabels: Record<BookStatus, string> = { wishlist: '想读', reading: '在读', finished: '读完' }
const sourceLabels: Record<BookSource, string> = { buy: '购买', borrow: '借入', library: '图书馆', ebook: '电子书' }
const form = reactive({
  title: '',
  author: '',
  status: 'wishlist' as BookStatus,
  source: 'buy' as BookSource,
  listPrice: '',
  paid: '',
  startDate: '',
  finishDate: '',
  pages: '',
  rating: '',
  note: '',
})

const stats = computed(() => getReadingStats(store.data.books, year.value))
const books = computed(() => {
  const rank: Record<BookStatus, number> = { reading: 0, wishlist: 1, finished: 2 }
  return store.data.books
    .filter((book) => filter.value === 'all' || book.status === filter.value)
    .slice()
    .sort((a, b) => rank[a.status] - rank[b.status] || b.createdAt - a.createdAt)
})

function resetForm() {
  form.title = ''
  form.author = ''
  form.status = 'wishlist'
  form.source = 'buy'
  form.listPrice = ''
  form.paid = ''
  form.startDate = ''
  form.finishDate = ''
  form.pages = ''
  form.rating = ''
  form.note = ''
  formError.value = ''
}

function openCreate() {
  editingId.value = ''
  resetForm()
  formOpen.value = true
}

function openEdit(book: Book) {
  editingId.value = book.id
  form.title = book.title
  form.author = book.author
  form.status = book.status
  form.source = book.source
  form.listPrice = book.listPrice ? centsToYuanInput(book.listPrice) : ''
  form.paid = book.paid ? centsToYuanInput(book.paid) : ''
  form.startDate = book.startDate
  form.finishDate = book.finishDate
  form.pages = book.pages ? String(book.pages) : ''
  form.rating = book.rating ? String(book.rating) : ''
  form.note = book.note
  formError.value = ''
  formOpen.value = true
}

function onStatus(status: BookStatus) {
  form.status = status
  if (status === 'reading' && !form.startDate) form.startDate = todayString()
  if (status === 'finished' && !form.finishDate) form.finishDate = todayString()
}

function onStatusChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === 'wishlist' || value === 'reading' || value === 'finished') onStatus(value)
}

function save() {
  if (!form.title.trim()) {
    formError.value = '请填写书名。'
    return
  }
  const listPrice = parseYuanToCents(form.listPrice, { allowZero: true })
  const paid = parseYuanToCents(form.paid, { allowZero: true })
  if (listPrice == null || paid == null) {
    formError.value = '标价和实付请填数字，可以是 0。'
    return
  }
  if (form.pages.trim() && !/^\d+$/.test(form.pages.trim())) {
    formError.value = '页数请填整数。'
    return
  }
  if (form.startDate && form.finishDate && form.startDate > form.finishDate) {
    formError.value = '读完日期不能早于开始日期。'
    return
  }
  store.saveBook({
    id: editingId.value || undefined,
    title: form.title,
    author: form.author,
    status: form.status,
    source: form.source,
    listPrice,
    paid,
    startDate: form.startDate,
    finishDate: form.finishDate,
    pages: form.pages.trim() ? Number(form.pages) : null,
    rating: form.rating ? Number(form.rating) : null,
    note: form.note,
  })
  formOpen.value = false
}
</script>

<template>
  <PageHeader title="阅读一览" lede="借来的书也算省钱。这里记想读、在读和读完。">
    <button type="button" class="btn primary" data-testid="add-book" @click="openCreate">添加一本书</button>
  </PageHeader>
  <div class="stack">
    <YearSwitcher v-model="year" />
    <section class="stats">
      <article class="card stat">
        <span>本年读完</span>
        <strong>{{ stats.finishedCount }} 本</strong>
      </article>
      <article class="card stat">
        <span>读完页数</span>
        <strong>{{ stats.pages }}</strong>
      </article>
      <article class="card stat">
        <span>借阅省下</span>
        <strong class="pos" data-testid="reading-saved">{{ formatCents(stats.saved) }}</strong>
      </article>
    </section>
    <div class="segmented" aria-label="筛选书单">
      <button type="button" :aria-pressed="filter === 'all'" @click="filter = 'all'">全部</button>
      <button type="button" :aria-pressed="filter === 'wishlist'" @click="filter = 'wishlist'">想读</button>
      <button type="button" :aria-pressed="filter === 'reading'" @click="filter = 'reading'">在读</button>
      <button type="button" :aria-pressed="filter === 'finished'" @click="filter = 'finished'">读完</button>
    </div>
    <section v-if="books.length" class="stack">
      <article v-for="book in books" :key="book.id" class="card book-card">
        <div class="book-top">
          <div>
            <h2>{{ book.title }}</h2>
            <p>{{ book.author || '未填作者' }} · {{ statusLabels[book.status] }} · {{ sourceLabels[book.source] }}</p>
            <p v-if="bookSavedAmount(book) > 0">省下 {{ formatCents(bookSavedAmount(book)) }}</p>
          </div>
          <span class="pill" :class="book.status === 'finished' ? 'done' : book.status === 'wishlist' ? 'paused' : ''">
            {{ statusLabels[book.status] }}
          </span>
        </div>
        <div class="actions">
          <button type="button" class="btn" @click="openEdit(book)">编辑</button>
          <button type="button" class="btn danger ghost" @click="deletingId = book.id">删除</button>
        </div>
      </article>
    </section>
    <EmptyState v-else title="还没有书" text="把想读的、在读的和借来的都记下来。借入或图书馆的书，省下的金额按标价减去实付来算。" />
  </div>

  <Modal :open="formOpen" :title="editingId ? '修改这本书' : '添加一本书'" @close="formOpen = false">
    <form class="form-grid" @submit.prevent="save">
      <label class="field">
        <span>书名</span>
        <input v-model="form.title" data-testid="book-title" maxlength="80" />
      </label>
      <label class="field">
        <span>作者</span>
        <input v-model="form.author" maxlength="40" />
      </label>
      <label class="field">
        <span>状态</span>
        <select :value="form.status" data-testid="book-status" @change="onStatusChange">
          <option value="wishlist">想读</option>
          <option value="reading">在读</option>
          <option value="finished">读完</option>
        </select>
      </label>
      <label class="field">
        <span>来源</span>
        <select v-model="form.source" data-testid="book-source">
          <option value="buy">购买</option>
          <option value="borrow">借入</option>
          <option value="library">图书馆</option>
          <option value="ebook">电子书</option>
        </select>
      </label>
      <label class="field">
        <span>标价（元）</span>
        <input v-model="form.listPrice" data-testid="book-list-price" inputmode="decimal" placeholder="0" />
      </label>
      <label class="field">
        <span>实付（元）</span>
        <input v-model="form.paid" data-testid="book-paid" inputmode="decimal" placeholder="0" />
      </label>
      <label class="field">
        <span>开始日期</span>
        <input v-model="form.startDate" data-testid="book-start" type="date" />
      </label>
      <label class="field">
        <span>读完日期</span>
        <input v-model="form.finishDate" type="date" />
      </label>
      <label class="field">
        <span>页数</span>
        <input v-model="form.pages" inputmode="numeric" />
      </label>
      <label class="field">
        <span>评分</span>
        <select v-model="form.rating">
          <option value="">不评分</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </label>
      <label class="field">
        <span>备注</span>
        <textarea v-model="form.note" maxlength="200" />
      </label>
      <p class="lede">读完日期留空时，按添加日期计入当年。借入和图书馆的省下金额 = 标价 − 实付。</p>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="form-actions">
        <button type="submit" class="btn primary" data-testid="save-book">保存</button>
      </div>
    </form>
  </Modal>

  <Modal :open="Boolean(deletingId)" title="从书单里删掉？" @close="deletingId = ''">
    <div class="form-actions">
      <button type="button" class="btn" @click="deletingId = ''">取消</button>
      <button type="button" class="btn danger" @click="store.removeBook(deletingId); deletingId = ''">删除</button>
    </div>
  </Modal>
</template>
