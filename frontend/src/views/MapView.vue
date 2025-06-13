<template>
  <v-app>
    <NodeDrawer
      v-model="drawer"
      :nodes="nodes"
      :panel-nodes="[]"
      @refresh="fetchNodes"
    />
    <v-main>
      <NodeMap :nodes="nodes" />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted, inject, watch } from 'vue'
import NodeDrawer from '@/components/NodeDrawer.vue'
import NodeMap from '@/components/NodeMap.vue'
import api from '@/plugins/axios'

const drawer = ref(false)
const nodes = ref([])
const activeSection = inject('activeSection', ref('panel'))

const fetchNodes = async () => {
  try {
    const res = await api.get('/nodes')
    nodes.value = res.data.map(n => ({ ...n, state: Boolean(n.state) }))
  } catch (err) {
    console.error('❌ Error al cargar nodos:', err)
  }
}

onMounted(fetchNodes)

watch(activeSection, val => {
  if (val === 'nodes') {
    drawer.value = true
  } else if (drawer.value) {
    drawer.value = false
  }
})
</script>
