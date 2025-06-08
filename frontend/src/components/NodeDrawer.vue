<template>
  <v-navigation-drawer
    v-model="localOpen"
    absolute
    location="right"
    width="300"
    class="node-drawer"
    style="overflow-y:auto"
  >
    <v-list>
      <v-list-item>
        <v-list-item-title class="text-h6">Tus Nodos</v-list-item-title>
      </v-list-item>

      <v-divider></v-divider>

      <v-list-item
        v-for="node in nodes"
        :key="node.id"
        class="pa-2"
      >
        <v-list-item-content>
          <v-list-item-title>{{ node.name }}</v-list-item-title>
        </v-list-item-content>
        <v-list-item-action>
          <v-btn
            icon
            color="primary"
            v-if="!panelNodes.some(n => n.id === node.id)"
            @click="addNodeToPanel(node)"
          >
            <v-icon>mdi-plus</v-icon>
          </v-btn>
          <v-btn
            icon
            color="error"
            v-else
            @click="removeNodeFromPanel(node)"
          >
            <v-icon>mdi-minus</v-icon>
          </v-btn>
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
  right: 56px;
  top: 0;
  height: 100%;
}
</style>
