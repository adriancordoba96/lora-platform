<template>
  <v-navigation-drawer app permanent>
    <v-list>
      <v-list-item>
        <v-list-item-title class="text-h6">Tus Nodos</v-list-item-title>
      </v-list-item>

      <v-divider></v-divider>

      <v-list-item
        v-for="node in nodes"
        :key="node.id"
        class="pa-2"
        style="white-space: normal;"
      >
        <v-list-item-content>
          <v-list-item-title>{{ node.name }}</v-list-item-title>
          <v-list-item-subtitle class="text-wrap text-body-2">
            {{ node.location }} — RSSI: {{ node.rssi ?? 'N/A' }} — Voltaje: {{ node.voltage ?? 'N/A' }} V — Corriente: {{ node.current ?? 'N/A' }} A
          </v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action>
          <v-switch
            v-model="node.state"
            @change="toggleNode(node)"
            inset
          ></v-switch>
        </v-list-item-action>
      </v-list-item>

      <v-divider class="my-2"></v-divider>

      <v-btn color="primary" @click="dialog = true">➕ Añadir Nodo</v-btn>
    </v-list>

    <!-- Diálogo para añadir nodo -->
    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>Añadir Nodo</v-card-title>
        <v-card-text>
          <v-text-field v-model="name" label="Nombre"></v-text-field>
          <v-text-field v-model="location" label="Ubicación"></v-text-field>
          <v-text-field v-model="identifier" label="Identificador MQTT"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="addNode">Guardar</v-btn>
          <v-btn text @click="dialog = false">Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/plugins/axios'

const nodes = ref([])
const dialog = ref(false)
const name = ref('')
const location = ref('')
const identifier = ref('')

// Cambiar estado del nodo
const toggleNode = async (node) => {
  try {
    await api.post(`/nodes/${node.identifier}/state`, {
      state: node.state ? 1 : 0,
    })
  } catch (err) {
    console.error('❌ Error al actualizar estado:', err)
  }
}

// Cargar nodos
const fetchNodes = async () => {
  try {
    const res = await api.get('/nodes')
    nodes.value = res.data.map(n => ({ ...n, state: Boolean(n.state) }))
  } catch (err) {
    console.error('❌ Error al cargar nodos:', err)
  }
}

// Crear nodo
const addNode = async () => {
  try {
    await api.post('/nodes/create', {
      name: name.value,
      location: location.value,
      identifier: identifier.value
    })
    dialog.value = false
    name.value = ''
    location.value = ''
    identifier.value = ''
    fetchNodes()
  } catch (err) {
    console.error('❌ Error al crear nodo:', err)
  }
}

// WebSocket en tiempo real
onMounted(() => {
  fetchNodes()

  const socket = new WebSocket('ws://3.66.72.52:3010') // Asegúrate de usar la IP pública
  socket.addEventListener('open', () => {
    console.log('✅ WebSocket conectado')
  })
  socket.addEventListener('message', event => {
    console.log('📩 Mensaje WebSocket recibido:', event.data)
    try {
      const msg = JSON.parse(event.data)
      if (msg.msg) {
        // 🔁 Actualizamos nodos cuando llegue cualquier mensaje
        fetchNodes()
      }
    } catch (e) {
      console.warn('⚠️ Error parseando mensaje WebSocket:', e)
    }
  })
})


</script>
