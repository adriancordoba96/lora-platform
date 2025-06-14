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

      <v-main>
      <v-container fluid class="fill-height">
        <v-row>
          <v-col cols="12">
            <v-tabs v-model="activeDashboard" class="mb-4">
              <v-tab
                v-for="(layout, name) in dashboards.layouts"
                :key="name"
                :value="name"
              >
                {{ name }}
              </v-tab>
            </v-tabs>
          </v-col>
        </v-row>
        <NodeGrid
          v-if="activeSection === 'panel'"
          :nodes="panelNodes"
          :scale="panelScale"
          :per-row="perRow"
          @toggle="toggleNode"
          @update:nodes="panelNodes = $event"
        />
        <NodeList v-else-if="activeSection === 'list'" :nodes="nodes" />
        <NodeMap v-else-if="activeSection === 'map'" :nodes="nodes" />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import NodeDrawer from '@/components/NodeDrawer.vue'
import NodeGrid from '@/components/NodeGrid.vue'
import NodeList from '@/components/NodeList.vue'
import NodeMap from '@/components/NodeMap.vue'
import { ref, onMounted, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/plugins/axios'

const nodes = ref([])
const panelNodes = ref([])
const dashboards = ref({ default: '', layouts: {} })
const activeDashboard = ref('')
const drawer = ref(false)
const activeSection = inject('activeSection', ref('panel'))
const perRow = ref(parseInt(localStorage.getItem('perRow')) || 3)
const panelScale = ref(parseFloat(localStorage.getItem('panelScale')) || 1)
const selectedDashboard = ref('')
const router = useRouter()

watch(perRow, val => localStorage.setItem('perRow', val))
watch(panelScale, val => localStorage.setItem('panelScale', val))
let firstLoad = true

watch(panelNodes, async val => {
  if (!activeDashboard.value) return
  try {
    await api.post('/dashboards', {
      name: activeDashboard.value,
      layout: val.map(n => n.id),
      isDefault: activeDashboard.value === dashboards.value.default
    })
  } catch (err) {
    console.error('❌ Error al guardar dashboard:', err)
  }
}, { deep: true })

watch(activeDashboard, val => {
  if (dashboards.value.layouts[val]) {
    const ids = dashboards.value.layouts[val]
    panelNodes.value = ids
      .map(id => nodes.value.find(n => n.id === id))
      .filter(n => n)
  }
})

watch(activeSection, val => {
  if (val === 'nodes') {
    drawer.value = true
  } else if (drawer.value) {
    drawer.value = false
  }
})

const fetchNodes = async () => {
  try {
    const res = await api.get('/nodes')
    nodes.value = res.data.map((n, i) => ({
      ...n,
      state: Boolean(n.state),
      x: n.x ?? (i % 4) * 250,
      y: n.y ?? Math.floor(i / 4) * 250
    }))
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
    dashboards.value = { default: res.data.default, layouts: res.data.layouts }
    activeDashboard.value = dashboards.value.default || Object.keys(dashboards.value.layouts)[0] || ''
    selectedDashboard.value = dashboards.value.default
    if (activeDashboard.value) {
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
  if (activeDashboard.value) {
    dashboards.value.layouts[activeDashboard.value] = panelNodes.value.map(n => n.id)
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

const setDefaultDashboard = async (name) => {
  dashboards.value.default = name
  selectedDashboard.value = name
  activeDashboard.value = name
  try {
    await api.post('/dashboards', {
      name,
      layout: dashboards.value.layouts[name] || [],
      isDefault: true
    })
  } catch (err) {
    console.error('❌ Error al actualizar dashboard por defecto:', err)
  }
}

const saveDashboard = async (name) => {
  dashboards.value.layouts[name] = panelNodes.value.map(n => n.id)
  await setDefaultDashboard(name)
}

const loadDashboard = async (name) => {
  const ids = dashboards.value.layouts[name] || []
  panelNodes.value = ids.map(id => nodes.value.find(n => n.id === id)).filter(Boolean)
  await setDefaultDashboard(name)
}

onMounted(() => {
  fetchNodes().then(loadDashboards)
  const socket = new WebSocket('ws://3.66.72.52:3010')
  socket.addEventListener('message', fetchNodes)
})
</script>

