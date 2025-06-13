<template>
  <div class="panel-scale" :style="wrapperStyle">
    <v-container>
      <draggable
      v-model="localNodes"
      item-key="id"
      class="v-row d-flex flex-wrap"
      :animation="200"
      @update:modelValue="emitUpdate"
      >
      <template #item="{ element: node }">
        <v-col
          cols="12"
          :sm="columnSpan"
          :md="columnSpan"
        >
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
              <vue-speedometer
                :value="Number(node.current) || 0"
                :min-value="0"
                :max-value="10"
                :needle-color="'#424242'"
                :ring-width="20"
                :text-color="'#333'"
                :value-text-font-size="'22px'"
                :custom-segment-stops="[0, 7.5, 10]"
                :segment-colors="['#4caf50', '#fb8c00']"
                :current-value-text="''"
                :show-value="true"
                :width="200"
                :height="130"
              />
            </v-col>
          </v-row>
        </v-card>
      </v-col>
      </template>
      </draggable>
    </v-container>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref, watch } from 'vue'
import VueSpeedometer from 'vue-speedometer'
import draggable from 'vuedraggable'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  perRow: { type: Number, default: 3 },
  scale: { type: Number, default: 1 }
})

const columnSpan = computed(() => {
  const columns = Math.max(1, Math.floor(props.perRow / props.scale))
  return Math.floor(12 / columns)
})

const wrapperStyle = computed(() => ({
  transform: `scale(${props.scale})`,
  transformOrigin: 'top left',
  width: `${100 / props.scale}%`
}))

const localNodes = ref([...props.nodes])

watch(
  () => props.nodes,
  val => {
    localNodes.value = [...val]
  },
  { deep: true }
)

const emitUpdate = () => {
  emit('update:nodes', localNodes.value)
}

const emit = defineEmits(['toggle'])

const toggleNode = (node) => {
  emit('toggle', node)
}

const toggleButton = (node) => {
  node.state = !node.state
  toggleNode(node)
}
</script>

<style scoped>
.panel-scale {
  overflow: visible;
}
</style>
