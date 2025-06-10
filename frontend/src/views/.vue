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

<PanelSettings
  v-model="settingsOpen"
  :cols="perRow"
  :dashboards="Object.keys(dashboards.layouts)"
  :default-dash="dashboards.default"
  @update:cols="perRow = $event"
  @save-dashboard="saveDashboard"
  @load-dashboard="loadDashboard"
  @update:defaultDash="(val) => { dashboards.default = val; selectedDashboard.value = val }"
  @update:defaultDash="(val) => { dashboards.value.default = val; selectedDashboard.value = val }"
/>
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
const dashboards = ref({})
const dashboards = ref({ default: '', layouts: {} })
const activeDashboard = ref('')
const defaultDashboard = ref('')
const drawer = ref(false)
const settingsOpen = ref(false)
const perRow = ref(parseInt(localStorage.getItem('perRow')) || 3)
const dashboards = ref(JSON.parse(localStorage.getItem('dashboards') || '{"default":"","layouts":{}}'))
const selectedDashboard = ref(dashboards.value.default || '')
const selectedDashboard = ref('')

watch(perRow, val => localStorage.setItem('perRow', val))
watch(dashboards, val => localStorage.setItem('dashboards', JSON.stringify(val)), { deep: true })
let firstLoad = true

watch(panelNodes, async val => {
  if (!activeDashboard.value) return
  try {
    await api.post('/dashboards', {
      name: activeDashboard.value,
      layout: val.map(n => n.id),
      isDefault: activeDashboard.value === defaultDashboard.value
      isDefault: activeDashboard.value === dashboards.value.default
    })
  } catch (err) {
    console.error('❌ Error al guardar dashboard:', err)
  }
}, { deep: true })

watch(activeDashboard, val => {
  if (dashboards.value[val]) {
    const ids = dashboards.value[val]
  if (dashboards.value.layouts[val]) {
    const ids = dashboards.value.layouts[val]
    panelNodes.value = ids
      .map(id => nodes.value.find(n => n.id === id))
      .filter(n => n)
  }
})

const fetchNodes = async () => {
  try {
    const res = await api.get('/nodes')
    nodes.value = res.data.map(n => ({ ...n, state: Boolean(n.state) }))
    if (firstLoad && selectedDashboard.value) {
      loadDashboard(selectedDashboard.value)
      firstLoad = false
    }
  } catch (err) {
    console.error('❌ Error al cargar nodos:', err)
  }
}

const loadDashboards = async () => {
  try {
    const res = await api.get('/dashboards')
    dashboards.value = res.data.layouts
    defaultDashboard.value = res.data.default || ''
    activeDashboard.value = defaultDashboard.value || Object.keys(dashboards.value)[0] || ''
    dashboards.value = { default: res.data.default, layouts: res.data.layouts }
    activeDashboard.value = dashboards.value.default || Object.keys(dashboards.value.layouts)[0] || ''
    selectedDashboard.value = dashboards.value.default
    if (activeDashboard.value) {
      const ids = dashboards.value[activeDashboard.value]
      const ids = dashboards.value.layouts[activeDashboard.value]
      panelNodes.value = ids
        .map(id => nodes.value.find(n => n.id === id))
        .filter(n => n)
    }
  } catch (err) {
    console.error('❌ Error al cargar dashboards:', err)
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

watch(panelNodes, () => {
  if (selectedDashboard.value) {
    dashboards.value.layouts[selectedDashboard.value] = panelNodes.value.map(n => n.id)
  }
}, { deep: true })

const toggleNode = async (node) => {
  try {
    await api.post(`/nodes/${node.identifier}/state`, {
      state: node.state ? 1 : 0,
    })
  } catch (err) {
    console.error('❌ Error al actualizar estado:', err)
  }
}

const saveDashboard = (name) => {
  dashboards.value.layouts[name] = panelNodes.value.map(n => n.id)
  dashboards.value.default = name
  selectedDashboard.value = name
}

const loadDashboard = (name) => {
  selectedDashboard.value = name
  dashboards.value.default = name
  const ids = dashboards.value.layouts[name] || []
  panelNodes.value = ids.map(id => nodes.value.find(n => n.id === id)).filter(Boolean)
}

onMounted(() => {
  fetchNodes().then(loadDashboards)
  const socket = new WebSocket('ws://3.66.72.52:3010')
  socket.addEventListener('message', fetchNodes)
})
</script>

