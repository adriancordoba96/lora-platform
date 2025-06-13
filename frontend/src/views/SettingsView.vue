<template>
  <v-app>
    <PanelSettings
      v-model="open"
      :cols="perRow"
      :dashboards="Object.keys(dashboards.layouts)"
      :default-dash="dashboards.default"
      :nodes="nodes"
      :panel-nodes="panelNodes"
      full-page
      @update:cols="perRow = $event"
      @save-dashboard="saveDashboard"
      @load-dashboard="loadDashboard"
      @update:defaultDash="setDefaultDashboard"
      @add-node="addToPanel"
      @remove-node="removeFromPanel"
      @refresh-nodes="fetchNodes"
    />
  </v-app>
</template>

<script setup>
import PanelSettings from '@/components/PanelSettings.vue'
import { ref, onMounted, watch } from 'vue'
import api from '@/plugins/axios'

const open = ref(true)
const nodes = ref([])
const panelNodes = ref([])
const dashboards = ref({ default: '', layouts: {} })
const activeDashboard = ref('')
const perRow = ref(parseInt(localStorage.getItem('perRow')) || 3)
const selectedDashboard = ref('')

watch(perRow, val => localStorage.setItem('perRow', val))
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
})
</script>
