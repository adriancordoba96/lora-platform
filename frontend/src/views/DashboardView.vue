<template>
  <v-app>
    <NodeDrawer
      v-model="drawer"
      :nodes="nodes"
      :panel-nodes="panelNodes"
      @add="addToPanel"
      @remove="removeFromPanel"
      @refresh="fetchNodes"
    />

<v-btn
      icon
      class="ma-2"
      :style="{ position: 'fixed', top: '80px', left: drawer ? '240px' : '10px', zIndex: 1000 }"
      @click="drawer = !drawer"
    >
      <v-icon>{{ drawer ? 'mdi-menu-open' : 'mdi-menu' }}</v-icon>
    </v-btn>

    <v-btn
      icon
      class="ma-2"
      :style="{ position: 'fixed', top: '80px', right: '10px', zIndex: 1000 }"
      @click="settingsOpen = true"
    >
      <v-icon>mdi-cog</v-icon>
    </v-btn>

    <PanelSettings v-model="settingsOpen" :cols="perRow" @update:cols="perRow = $event" />

    <v-main>
      <v-container>
        <NodePanel :nodes="panelNodes" :per-row="perRow" @toggle="toggleNode" />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import NodeDrawer from '@/components/NodeDrawer.vue'
import NodePanel from '@/components/NodePanel.vue'
import PanelSettings from '@/components/PanelSettings.vue'
import { ref, onMounted, watch } from 'vue'
import api from '@/plugins/axios'

const nodes = ref([])
const panelNodes = ref([])
const drawer = ref(false)
const settingsOpen = ref(false)
const perRow = ref(parseInt(localStorage.getItem('perRow')) || 3)

watch(perRow, val => localStorage.setItem('perRow', val))

const fetchNodes = async () => {
  try {
    const res = await api.get('/nodes')
    nodes.value = res.data.map(n => ({ ...n, state: Boolean(n.state) }))
  } catch (err) {
    console.error('❌ Error al cargar nodos:', err)
  }
}

const addToPanel = (node) => {
  if (!panelNodes.value.find(n => n.id === node.id)) {
    panelNodes.value.push(node)
  }
}

const removeFromPanel = (node) => {
  panelNodes.value = panelNodes.value.filter(n => n.id !== node.id)
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

onMounted(() => {
  fetchNodes()
  const socket = new WebSocket('ws://3.66.72.52:3010')
  socket.addEventListener('message', fetchNodes)
})
</script>

