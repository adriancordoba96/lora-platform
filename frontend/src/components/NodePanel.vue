<template>
  <v-container>
    <v-row>
      <v-col v-for="node in nodes" :key="node.id" cols="12" :sm="columnSpan" :md="columnSpan">
        <v-card class="ma-2">
          <v-card-title class="d-flex justify-space-between align-center">
            {{ node.name }}
            <v-btn
              :color="node.state ? 'green' : 'red'"
              @click="toggleButton(node)"
              class="text-white"
              density="comfortable"
            >
              Salida
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
        <v-row class="pa-2 text-center" density="compact">
          <v-col cols="4">
            <v-icon color="primary">mdi-signal</v-icon>
            <div class="text-caption">RSSI</div>
            <div class="text-body-2">{{ node.rssi ?? 'N/A' }}</div>
          </v-col>
          <v-col cols="4">
            <v-icon color="primary">mdi-flash</v-icon>
            <div class="text-caption">Voltaje</div>
            <div class="text-body-2">{{ node.voltage ?? 'N/A' }} V</div>
          </v-col>
          <v-col cols="4">
            <v-icon color="primary">mdi-current-ac</v-icon>
            <div class="text-caption">Corriente</div>
            <div class="text-body-2">{{ node.current ?? 'N/A' }} A</div>
          </v-col>
        </v-row>
        <v-row class="pb-0 justify-center">
          <v-col cols="12" class="d-flex justify-center">
            <VueSpeedometer
              :value="Number(node.current) || 0"
              :min-value="0"
              :max-value="10"
              :segments="5"
              needle-color="#f44336"
              width="175"
            />
          </v-col>
        </v-row>
      </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue'
import VueSpeedometer from 'vue-speedometer'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  perRow: { type: Number, default: 3 }
})

const columnSpan = computed(() => Math.floor(12 / props.perRow))

const emit = defineEmits(['toggle'])

const toggleNode = (node) => {
  emit('toggle', node)
}

const toggleButton = (node) => {
  node.state = !node.state
  toggleNode(node)
}
</script>
