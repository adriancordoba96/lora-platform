<template>
  <v-container class="pa-4">
    <h2>Perfil de usuario</h2>
    <p>Usuario: {{ username }}</p>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const username = ref('')

onMounted(() => {
  username.value = localStorage.getItem('username') || ''
})
</script>
