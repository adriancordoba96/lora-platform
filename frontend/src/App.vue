<template>
  <v-app>
    <v-app-bar app>
      <v-toolbar-title>LoRa Control</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn text v-if="!loggedIn" to="/">Inicio</v-btn>
      <v-btn text v-if="!loggedIn" to="/login">Login</v-btn>
      <v-btn text v-if="!loggedIn" to="/register">Registro</v-btn>
      <span v-else class="mr-4">Bienvenido, {{ username }}</span>

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

    <v-main>
      <router-view :lang="selectedLang" />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, provide, onMounted } from 'vue'

const selectedLang = ref('es')
provide('lang', selectedLang)

const username = ref('')
const loggedIn = ref(false)

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
</script>
