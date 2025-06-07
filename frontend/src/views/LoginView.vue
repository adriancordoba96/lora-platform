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
          :label="t('password')"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showPassword = !showPassword"
          :error-messages="errors.password"
        />

        <v-btn :loading="loading" @click="doLogin" class="mt-4" color="primary" block>
          {{ t('login') }}
        </v-btn>

        <v-alert v-if="error" type="error" class="mt-4">{{ error }}</v-alert>

        <v-divider class="my-4" />

        <div class="text-center">
          <RouterLink to="/recover">{{ t('forgot') }}</RouterLink>
        </div>

        <v-divider class="my-4" />

        <div class="text-center text-caption text-grey">
          {{ t('or_continue') }}
        </div>

        <v-btn block class="mt-2" color="red lighten-1" variant="outlined" disabled>
          <v-icon start>mdi-google</v-icon>
          Google
        </v-btn>

        <v-divider class="my-4" />

        <div class="text-center">
          {{ t('no_account') }}
          <RouterLink to="/register">{{ t('register_here') }}</RouterLink>
        </div>
      </v-card>
    </transition>
  </v-container>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '@/services/api'

const lang = inject('lang', ref('es'))

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const errors = ref({ username: '', password: '' })

const router = useRouter()

const t = (key) => {
  const texts = {
    es: {
      title: 'Iniciar sesión',
      username: 'Usuario',
      password: 'Contraseña',
      login: 'Entrar',
      no_account: '¿No tienes cuenta?',
      register_here: 'Regístrate aquí',
      required: 'Este campo es obligatorio',
      forgot: '¿Has olvidado tu contraseña?',
      or_continue: 'o continúa con'
    },
    en: {
      title: 'Login',
      username: 'Username',
      password: 'Password',
      login: 'Sign In',
      no_account: 'Don’t have an account?',
      register_here: 'Register here',
      required: 'This field is required',
      forgot: 'Forgot your password?',
      or_continue: 'or continue with'
    }
  }
  return texts[lang.value][key] || key
}

const doLogin = async () => {
  error.value = ''
  errors.value = { username: '', password: '' }

  if (!username.value) errors.value.username = t('required')
  if (!password.value) errors.value.password = t('required')
  if (errors.value.username || errors.value.password) return

  loading.value = true
  try {
    const res = await login(username.value, password.value)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('username', res.data.username)
    window.dispatchEvent(new Event('auth-changed'))
    router.push('/dashboard')
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al iniciar sesión'
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
