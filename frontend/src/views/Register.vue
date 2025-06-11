<template>
  <v-container class="d-flex flex-column align-center justify-center" style="height: 100vh;">
    <transition name="fade">
      <v-card class="pa-6" max-width="400">
        <v-card-title class="text-h6 mb-4 text-center">
          <v-icon size="36" color="primary">mdi-lan-connect</v-icon>
          <div class="mt-2">{{ t('title') }}</div>
        </v-card-title>

        <v-text-field
          :label="t('username')"
          v-model="username"
          :error-messages="errors.username"
        />
        <v-text-field
          :label="t('email')"
          v-model="email"
          :error-messages="errors.email"
        />
        <v-text-field
          :label="t('phone')"
          v-model="phone"
          :error-messages="errors.phone"
        />
        <v-text-field
          :label="t('password')"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showPassword = !showPassword"
          :error-messages="errors.password"
        />
        <v-text-field
          :label="t('confirm')"
          v-model="confirmPassword"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showPassword = !showPassword"
          :error-messages="errors.confirm"
        />

        <v-btn :loading="loading" @click="registerUser" class="mt-4" color="primary" block>
          {{ t('register') }}
        </v-btn>

        <v-alert v-if="error" type="error" class="mt-4">{{ error }}</v-alert>
        <v-alert v-if="success" type="success" class="mt-4">
          {{ t('success') }} <RouterLink to="/login">{{ t('login_here') }}</RouterLink>
        </v-alert>

        <v-divider class="my-4" />

        <div class="text-center text-caption text-grey">
          {{ t('or_continue') }}
        </div>

        <v-btn block class="mt-2" color="red lighten-1" variant="outlined" disabled>
          <v-icon start>mdi-google</v-icon>
          Google
        </v-btn>
      </v-card>
    </transition>
  </v-container>
</template>

<script setup>
import { ref, inject } from 'vue'
import { register } from '@/services/api'

const lang = inject('lang', ref('es'))

const username = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref(false)
const loading = ref(false)
const showPassword = ref(false)

const errors = ref({ username: '', email: '', phone: '', password: '', confirm: '' })

const t = (key) => {
  const texts = {
    es: {
      title: 'Registro de usuario',
      username: 'Usuario',
      email: 'Correo electrónico',
      phone: 'Teléfono',
      password: 'Contraseña',
      confirm: 'Confirmar contraseña',
      register: 'Registrarse',
      login_here: 'Inicia sesión',
      success: '¡Registro completado!',
      required: 'Este campo es obligatorio',
      mismatch: 'Las contraseñas no coinciden.',
      or_continue: 'o continúa con'
    },
    en: {
      title: 'User Registration',
      username: 'Username',
      email: 'Email',
      phone: 'Phone',
      password: 'Password',
      confirm: 'Confirm password',
      register: 'Register',
      login_here: 'Login here',
      success: 'Registration completed!',
      required: 'This field is required',
      mismatch: 'Passwords do not match.',
      or_continue: 'or continue with'
    }
  }
  return texts[lang.value][key] || key
}

const registerUser = async () => {
  error.value = ''
  success.value = false
  errors.value = { username: '', email: '', phone: '', password: '', confirm: '' }

  if (!username.value) errors.value.username = t('required')
  if (!email.value) errors.value.email = t('required')
  if (!phone.value) errors.value.phone = t('required')
  if (!password.value) errors.value.password = t('required')
  if (!confirmPassword.value) errors.value.confirm = t('required')
  if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
    errors.value.confirm = t('mismatch')
  }

  if (Object.values(errors.value).some(e => e)) return

  loading.value = true
  try {
    await register(username.value, email.value, password.value, phone.value)
    success.value = true
    username.value = ''
    email.value = ''
    phone.value = ''
    password.value = ''
    confirmPassword.value = ''
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al registrar usuario.'
  } finally {
    loading.value = false
  }
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
