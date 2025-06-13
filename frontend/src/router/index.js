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
import GeneralSettings from '../views/settings/GeneralSettings.vue'
import DashboardSettings from '../views/settings/DashboardSettings.vue'
import GroupsSettings from '../views/settings/GroupsSettings.vue'
import NodesSettings from '../views/settings/NodesSettings.vue'
import GatewaySettings from '../views/settings/GatewaySettings.vue'
import AlarmsSettings from '../views/settings/AlarmsSettings.vue'
import ProfilesSettings from '../views/settings/ProfilesSettings.vue'
import SystemSettings from '../views/settings/SystemSettings.vue'

const routes = [
{ path: '/', name: 'Landing', component: LandingView },
  { path: '/login', component: LoginView },
  { path: '/dashboard', component: DashboardView },
  { path: '/map', component: MapView },
  { path: '/register', component: Register },
  { path: '/recover', component: Recover },
  { path: '/reset', component: ResetPassword },
  { path: '/profile', component: ProfileView },
  {
    path: '/settings',
    component: SettingsView,
    children: [
      { path: '', redirect: '/settings/general' },
      { path: 'general', component: GeneralSettings },
      { path: 'dashboard', component: DashboardSettings },
      { path: 'groups', component: GroupsSettings },
      { path: 'nodes', component: NodesSettings },
      { path: 'gateway', component: GatewaySettings },
      { path: 'alarms', component: AlarmsSettings },
      { path: 'profiles', component: ProfilesSettings },
      { path: 'system', component: SystemSettings }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
