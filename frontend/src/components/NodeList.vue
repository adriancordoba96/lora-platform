<template>
  <v-container>
    <v-data-table :headers="headers" :items="nodes" density="comfortable">
      <template #item.state="{ item }">
        <v-icon :color="item.state ? 'green' : 'red'">
          {{ item.state ? 'mdi-check-circle' : 'mdi-close-circle' }}
        </v-icon>
      </template>
    </v-data-table>
  </v-container>
</template>

<script setup>
import { defineProps } from 'vue'

const headers = [
  { title: 'Nombre', value: 'name' },
  { title: 'Identificador', value: 'identifier' },
  { title: 'Ubicación', value: 'location' },
  { title: 'Voltaje', value: 'voltage' },
  { title: 'Corriente', value: 'current' },
  { title: 'RSSI', value: 'rssi' },
  { title: 'Estado', value: 'state' }
]

const props = defineProps({
  nodes: { type: Array, default: () => [] }
})
</script>
