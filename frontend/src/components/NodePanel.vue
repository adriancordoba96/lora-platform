<template>
  <v-container>
    <v-row>
      <v-col v-for="node in nodes" :key="node.id" cols="12" sm="6" md="4">
        <v-card class="ma-2">
          <v-card-title>{{ node.name }}</v-card-title>
          <v-card-text>
            <div>RSSI: {{ node.rssi ?? 'N/A' }}</div>
            <div>Voltaje: {{ node.voltage ?? 'N/A' }} V</div>
            <div>Corriente: {{ node.current ?? 'N/A' }} A</div>
            <v-switch
              v-model="node.state"
              @change="toggleNode(node)"
              class="mt-2"
              :label="node.state ? 'Encendido' : 'Apagado'"
            ></v-switch>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/plugins/axios'

const nodes = ref([])

const fetchNodes = async () => {
  try {
    const res = await api.get('/nodes')
    nodes.value = res.data.map(n => ({ ...n, state: Boolean(n.state) }))
  } catch (err) {
    console.error('❌ Error al cargar nodos:', err)
  }
}

const toggleNode = async (node) => {
  try {
    await api.post(`/nodes/${node.identifier}/state`, {
      state: node.state ? 1 : 0,
    })
  } catch (err) {
    console.error('❌ Error al actualizar estado:', err)
  }
}

onMounted(fetchNodes)

onMounted(() => {
  const socket = new WebSocket('ws://3.66.72.52:3010')
  socket.addEventListener('message', () => {
    fetchNodes()
  })
})
</script>
