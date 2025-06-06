<template>
  <v-container class="d-flex flex-column align-center justify-center" style="height: 100vh;">
    <v-card class="pa-6" max-width="400">
      <v-card-title class="text-h6 mb-4">Restablecer contraseña</v-card-title>
      <v-text-field
        v-model="password"
        label="Nueva contraseña"
        type="password"
        class="mb-2"
      />
      <v-text-field
        v-model="confirmPassword"
        label="Confirmar contraseña"
        type="password"
      />
      <v-btn class="mt-4" color="primary" block @click="resetPassword">Restablecer</v-btn>
      <v-alert v-if="message" type="success" class="mt-4">{{ message }}</v-alert>
      <v-alert v-if="error" type="error" class="mt-4">{{ error }}</v-alert>
      <div class="text-center mt-4">
        <RouterLink to="/login">Volver al login</RouterLink>
      </div>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRoute } from 'vue-router'

const route = useRoute()
const token = ref('')
const password = ref('')
const confirmPassword = ref('')
const message = ref('')
const error = ref('')

onMounted(() => {
  token.value = route.query.token || ''
})

const resetPassword = async () => {
  message.value = ''
  error.value = ''

  if (!password.value || !confirmPassword.value) {
    error.value = 'Completa ambos campos.'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }

  try {
    await axios.post('http://3.66.72.52:3010/api/reset', {
      token: token.value,
      password: password.value
    })
    message.value = '✅ Contraseña actualizada. Ya puedes iniciar sesión.'
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al restablecer la contraseña.'
  }
}
</script>
