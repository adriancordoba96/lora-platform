import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import Register from '../views/Register.vue' 
import LandingView from '../views/LandingView.vue'
import Recover from '../views/Recover.vue'
import ResetPassword from '../views/ResetPassword.vue'

const routes = [
{ path: '/', name: 'Landing', component: LandingView },
  { path: '/login', component: LoginView },
  { path: '/dashboard', component: DashboardView },
  { path: '/register', component: Register },
  { path: '/recover', component: Recover },
  { path: '/reset', component: ResetPassword }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
