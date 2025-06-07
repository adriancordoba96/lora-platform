<template>
  <v-container>
    <v-row>
      <v-col v-for="node in nodes" :key="node.id" cols="12" :sm="columnSpan" :md="columnSpan">
        <v-card class="ma-2">
          <v-card-title class="d-flex justify-space-between">
            {{ node.name }}
            <v-switch
              v-model="node.state"
              @change="toggleNode(node)"
              :label="node.state ? 'Encendido' : 'Apagado'"
              hide-details
            ></v-switch>
          </v-card-title>
          <v-divider></v-divider>
          <v-list density="compact">
            <v-list-item>
              <v-list-item-icon>
                <v-icon color="primary">mdi-signal</v-icon>
              </v-list-item-icon>
              <v-list-item-title>RSSI</v-list-item-title>
              <v-list-item-subtitle>{{ node.rssi ?? 'N/A' }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-icon>
                <v-icon color="primary">mdi-flash</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Voltaje</v-list-item-title>
              <v-list-item-subtitle>{{ node.voltage ?? 'N/A' }} V</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-icon>
                <v-icon color="primary">mdi-current-ac</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Corriente</v-list-item-title>
              <v-list-item-subtitle>{{ node.current ?? 'N/A' }} A</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  perRow: { type: Number, default: 3 }
})

const columnSpan = computed(() => Math.floor(12 / props.perRow))

const emit = defineEmits(['toggle'])

const toggleNode = (node) => {
  emit('toggle', node)
}
</script>
