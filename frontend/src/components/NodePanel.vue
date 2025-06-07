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
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  nodes: { type: Array, default: () => [] }
})

const emit = defineEmits(['toggle'])

const toggleNode = (node) => {
  emit('toggle', node)
}
</script>
