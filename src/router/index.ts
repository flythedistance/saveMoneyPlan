import { createRouter, createWebHashHistory } from 'vue-router'
import AdviceView from '../views/AdviceView.vue'
import GoalsView from '../views/GoalsView.vue'
import HomeView from '../views/HomeView.vue'
import LedgerView from '../views/LedgerView.vue'
import MonthView from '../views/MonthView.vue'
import PlanView from '../views/PlanView.vue'
import ProgressView from '../views/ProgressView.vue'
import ReadingView from '../views/ReadingView.vue'
import SettingsView from '../views/SettingsView.vue'
import YearView from '../views/YearView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title: '首页' } },
    { path: '/ledger', name: 'ledger', component: LedgerView, meta: { title: '记账' } },
    { path: '/month', name: 'month', component: MonthView, meta: { title: '月度一览' } },
    { path: '/year', name: 'year', component: YearView, meta: { title: '年度一览' } },
    { path: '/reading', name: 'reading', component: ReadingView, meta: { title: '阅读一览' } },
    { path: '/goals', name: 'goals', component: GoalsView, meta: { title: '省钱目标' } },
    { path: '/plan', name: 'plan', component: PlanView, meta: { title: '省钱计划' } },
    { path: '/progress', name: 'progress', component: ProgressView, meta: { title: '完成进度' } },
    { path: '/advice', name: 'advice', component: AdviceView, meta: { title: '建议' } },
    { path: '/settings', name: 'settings', component: SettingsView, meta: { title: '设置' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
