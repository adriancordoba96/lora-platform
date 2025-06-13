import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import MapView from '../views/MapView.vue'
import Register from '../views/Register.vue'
import LandingView from '../views/LandingView.vue'
import Recover from '../views/Recover.vue'
import ResetPassword from '../views/ResetPassword.vue'
import ProfileView from '../views/ProfileView.vue'
import SettingsView from '../views/SettingsView.vue'

const routes = [
{ path: '/', name: 'Landing', component: LandingView },
  { path: '/login', component: LoginView },
  { path: '/dashboard', component: DashboardView },
  { path: '/map', component: MapView },
  { path: '/register', component: Register },
  { path: '/recover', component: Recover },
  { path: '/reset', component: ResetPassword },
  { path: '/profile', component: ProfileView },
  { path: '/settings', component: SettingsView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
