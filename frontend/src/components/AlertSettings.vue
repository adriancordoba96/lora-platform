<template>
  <v-container>
    <v-card class="pa-4">
      <v-card-title>Configuración de alertas</v-card-title>
      <v-card-text>
        <v-text-field v-model="form.email" label="Email"></v-text-field>
        <v-text-field v-model="form.telegram_token" label="Telegram token"></v-text-field>
        <v-text-field v-model="form.telegram_chat_id" label="Telegram chat id"></v-text-field>
        <v-text-field v-model="form.whatsapp_sid" label="Twilio SID"></v-text-field>
        <v-text-field v-model="form.whatsapp_token" label="Twilio Token"></v-text-field>
        <v-text-field v-model="form.whatsapp_from" label="WhatsApp From"></v-text-field>
        <v-text-field v-model="form.whatsapp_to" label="WhatsApp To"></v-text-field>
        <v-btn color="primary" class="mt-4" @click="save">Guardar</v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/plugins/axios'

const form = ref({
  email: '',
  telegram_token: '',
  telegram_chat_id: '',
  whatsapp_sid: '',
  whatsapp_token: '',
  whatsapp_from: '',
  whatsapp_to: ''
})

const fetchSettings = async () => {
  try {
    const res = await api.get('/alert-settings')
    Object.assign(form.value, res.data || {})
  } catch (err) {
    console.error('❌ Error cargando configuración:', err)
  }
}

const save = async () => {
  try {
    await api.post('/alert-settings', form.value)
    alert('Configuración guardada')
  } catch (err) {
    console.error('❌ Error guardando configuración:', err)
  }
}

onMounted(fetchSettings)
</script>
