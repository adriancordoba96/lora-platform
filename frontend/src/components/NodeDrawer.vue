<template>
  <v-navigation-drawer
    v-model="localOpen"
    absolute
    location="left"
    width="300"
    class="node-drawer"
    style="overflow-y:auto"
  >
    <v-toolbar density="compact" flat>
      <v-toolbar-title>Tus Nodos</v-toolbar-title>
      <v-spacer />
      <v-btn icon color="primary" @click="dialog = true">
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </v-toolbar>

    <v-divider></v-divider>

    <v-list density="compact">
      <v-list-item v-for="node in nodes" :key="node.id" class="px-2">
        <v-checkbox
          :label="node.name"
          hide-details
          density="compact"
          color="primary"
          :model-value="panelNodes.some(n => n.id === node.id)"
          @update:model-value="val => val ? addNodeToPanel(node) : removeNodeFromPanel(node)"
        />
      </v-list-item>
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
import { ref, watch, defineProps, defineEmits } from 'vue'
import api from '@/plugins/axios'

const props = defineProps({
  modelValue: { type: Boolean, default: true },
  nodes: { type: Array, default: () => [] },
  panelNodes: { type: Array, default: () => [] }
})

const emit = defineEmits(['add', 'remove', 'refresh', 'update:modelValue'])

const localOpen = ref(props.modelValue)

watch(
  () => props.modelValue,
  val => {
    localOpen.value = val
  }
)

watch(localOpen, val => emit('update:modelValue', val))

const dialog = ref(false)
const name = ref('')
const location = ref('')
const identifier = ref('')

const addNodeToPanel = (node) => emit('add', node)
const removeNodeFromPanel = (node) => emit('remove', node)

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
    emit('refresh')
  } catch (err) {
    console.error('❌ Error al crear nodo:', err)
  }
}

</script>

<style scoped>
.node-drawer {
  left: 56px;
  top: 0;
  height: 100%;
}
</style>