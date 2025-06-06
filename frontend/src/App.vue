<template>
  <v-app>
    <v-app-bar app>
      <v-toolbar-title>LoRa Control</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn text to="/">Inicio</v-btn>
      <v-btn text to="/login">Login</v-btn>
      <v-btn text to="/register">Registro</v-btn>

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
import { ref, provide } from 'vue'

const selectedLang = ref('es')
provide('lang', selectedLang)

const changeLang = (lang) => {
  selectedLang.value = lang
}
</script>
