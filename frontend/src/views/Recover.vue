<template>
  <v-container class="d-flex flex-column align-center justify-center" style="height: 100vh;">
    <transition name="fade">
      <v-card class="pa-6" max-width="400">
        <v-card-title class="text-h6 mb-4 text-center">
          <v-icon size="36" color="primary">mdi-lock-reset</v-icon>
          <div class="mt-2">{{ t('title') }}</div>
        </v-card-title>

        <v-text-field
          :label="t('email')"
          v-model="email"
          :error-messages="errorMessage"
        />

        <v-btn :loading="loading" @click="sendReset" class="mt-4" color="primary" block>
          {{ t('send') }}
        </v-btn>

        <v-alert v-if="sent" type="success" class="mt-4">
          {{ t('success') }}
        </v-alert>

        <v-divider class="my-4" />
        <div class="text-center">
          <RouterLink to="/login">{{ t('back') }}</RouterLink>
        </div>
      </v-card>
    </transition>
  </v-container>
</template>

<script setup>
import { ref, inject } from 'vue'

const lang = inject('lang', ref('es'))

const email = ref('')
const errorMessage = ref('')
const sent = ref(false)
const loading = ref(false)

const t = (key) => {
  const texts = {
    es: {
      title: 'Recuperar contraseña',
      email: 'Correo electrónico',
      send: 'Enviar enlace de recuperación',
      success: 'Si ese email existe, se ha enviado un enlace de recuperación.',
      back: 'Volver al login',
      required: 'Por favor, introduce un correo válido.'
    },
    en: {
      title: 'Recover Password',
      email: 'Email',
      send: 'Send recovery link',
      success: 'If that email exists, a recovery link has been sent.',
      back: 'Back to login',
      required: 'Please enter a valid email.'
    }
  }
  return texts[lang.value][key] || key
}

const sendReset = async () => {
  errorMessage.value = ''
  sent.value = false

  if (!email.value || !email.value.includes('@')) {
    errorMessage.value = t('required')
    return
  }

  loading.value = true
  // Aquí se simularía la llamada al backend
  setTimeout(() => {
    sent.value = true
    loading.value = false
  }, 1000)
}
</script>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
