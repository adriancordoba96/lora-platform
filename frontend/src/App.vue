<template>
  <v-app>
    <v-app-bar app>
      <v-toolbar-title>LoRa Control</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn text v-if="!loggedIn" to="/">Inicio</v-btn>
      <v-btn text v-if="!loggedIn" to="/login">Login</v-btn>
      <v-btn text v-if="!loggedIn" to="/register">Registro</v-btn>
      <v-menu v-else offset-y>
        <template #activator="{ props }">
          <v-btn v-bind="props" text>
            Bienvenido, {{ username }}
            <v-icon end>mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item to="/profile">
            <v-list-item-title>Perfil</v-list-item-title>
          </v-list-item>
          <v-list-item @click="logout">
            <v-list-item-title>Cerrar sesión</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-menu offset-y>
        <template #activator="{ props }">
          <v-btn v-bind="props" text>
            {{ selectedLang === 'es' ? '🇪🇸 Idioma' : '🇬🇧 Language' }}
            <v-icon end>mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item @click="changeLang('es')">
            <v-list-item-title>🇪🇸 Español</v-list-item-title>
          </v-list-item>
          <v-list-item @click="changeLang('en')">
            <v-list-item-title>🇬🇧 English</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <RightNav v-model="activeSection" @open-settings="goSettings" />

    <v-main>
      <router-view :lang="selectedLang" />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, provide, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import RightNav from '@/components/RightNav.vue'

const selectedLang = ref('es')
provide('lang', selectedLang)

const username = ref('')
const loggedIn = ref(false)
const router = useRouter()
const route = useRoute()

const activeSection = ref('panel')
provide('activeSection', activeSection)

watch(activeSection, val => {
  if (val === 'settings') {
    if (route.path !== '/settings') router.push('/settings')
  } else if (val === 'map') {
    if (route.path !== '/map') router.push('/map')
  } else {
    if (route.path !== '/dashboard') router.push('/dashboard')
  }
})

watch(
  () => route.path,
  path => {
    if (path === '/settings') {
      activeSection.value = 'settings'
    } else if (path === '/map') {
      activeSection.value = 'map'
    } else if (
      path === '/dashboard' &&
      (activeSection.value === 'settings' || activeSection.value === 'map')
    ) {
      activeSection.value = 'panel'
    }
  },
  { immediate: true }
)

const updateAuth = () => {
  username.value = localStorage.getItem('username') || ''
  loggedIn.value = Boolean(localStorage.getItem('token'))
}

onMounted(() => {
  updateAuth()
  window.addEventListener('auth-changed', updateAuth)
})

const changeLang = (lang) => {
  selectedLang.value = lang
}

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  updateAuth()
  window.dispatchEvent(new Event('auth-changed'))
  router.push('/login')
}

const goSettings = () => {
  activeSection.value = 'settings'
}
</script>
