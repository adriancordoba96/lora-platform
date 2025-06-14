<template>
  <div class="grid" ref="gridRef" :style="gridStyle">
    <div
      v-for="node in localNodes"
      :key="node.id"
      class="grid-item"
      :style="getItemStyle(node)"
      @mousedown="startDrag(node, $event)"
    >
      <v-card class="node-card">
        <v-card-title class="d-flex justify-space-between align-center">
          {{ node.name }}
          <v-btn
            :color="node.state ? 'green' : 'red'"
            @click.stop="toggleButton(node)"
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
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits, computed, onMounted, onUnmounted } from 'vue'
import VueSpeedometer from 'vue-speedometer'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  scale: { type: Number, default: 1 },
  perRow: { type: Number, default: 3 }
})

const emit = defineEmits(['update:nodes', 'toggle'])

const localNodes = ref(
  props.nodes.map((n, i) => ({
    ...n,
    xIndex: n.xIndex ?? (i % props.perRow),
    yIndex: n.yIndex ?? Math.floor(i / props.perRow)
  }))
)

watch(
  () => props.nodes,
  val => {
    localNodes.value = val.map((n, i) => ({
      ...n,
      xIndex: n.xIndex ?? (i % props.perRow),
      yIndex: n.yIndex ?? Math.floor(i / props.perRow)
    }))
  },
  { deep: true }
)

const gridRef = ref(null)
const dragging = ref(null)
const offsetX = ref(0)
const offsetY = ref(0)

const NODE_WIDTH = 240
const NODE_HEIGHT = 260
const DEFAULT_GRID = 260

const nodeWidth = computed(() => NODE_WIDTH * props.scale)
const nodeHeight = computed(() => NODE_HEIGHT * props.scale)

const gridWidth = ref(0)
const gridSize = computed(() => {
  if (!gridWidth.value || !props.perRow) return DEFAULT_GRID * props.scale
  return (gridWidth.value / props.perRow)
})
const spacing = computed(() => gridSize.value - nodeWidth.value)

function updateGridWidth() {
  gridWidth.value = gridRef.value?.clientWidth || 0
}

onMounted(() => {
  updateGridWidth()
  window.addEventListener('resize', updateGridWidth)
})
onUnmounted(() => window.removeEventListener('resize', updateGridWidth))

const gridStyle = computed(() => ({
  backgroundSize: `${gridSize.value}px ${gridSize.value}px`
}))

function getItemStyle(node) {
  const offset = spacing.value / 2
  return {
    left: node.xIndex * gridSize.value + offset + 'px',
    top: node.yIndex * gridSize.value + offset + 'px',
    width: NODE_WIDTH + 'px',
    height: NODE_HEIGHT + 'px',
    transform: `scale(${props.scale})`,
    transformOrigin: 'top left'
  }
}

function startDrag(node, e) {
  dragging.value = node
  offsetX.value = e.offsetX
  offsetY.value = e.offsetY
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', stopDrag)
}

function onMouseMove(e) {
  if (!dragging.value || !gridRef.value) return
  const rect = gridRef.value.getBoundingClientRect()
  let x = e.clientX - rect.left - offsetX.value
  let y = e.clientY - rect.top - offsetY.value
  x = Math.max(0, Math.min(x, rect.width - nodeWidth.value))
  y = Math.max(0, Math.min(y, rect.height - nodeHeight.value))
  const col = Math.round(x / gridSize.value)
  const row = Math.round(y / gridSize.value)
  const occupied = localNodes.value.some(n => n !== dragging.value && n.xIndex === col && n.yIndex === row)
  if (!occupied) {
    dragging.value.xIndex = col
    dragging.value.yIndex = row
  }
}

function stopDrag() {
  if (dragging.value) emit('update:nodes', localNodes.value)
  dragging.value = null
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', stopDrag)
}

function toggleNode(node) {
  emit('toggle', node)
}

function toggleButton(node) {
  node.state = !node.state
  toggleNode(node)
}
</script>

<style scoped>
.grid {
  position: relative;
  width: 100%;
  height: 650px;
  background-color: #f5f5f5;
  background-image:
    linear-gradient(to right, #e0e0e0 1px, transparent 1px),
    linear-gradient(to bottom, #e0e0e0 1px, transparent 1px);
  overflow: hidden;
}
.grid-item {
  position: absolute;
  width: 240px;
  height: 260px;
  cursor: move;
}
.node-card {
  width: 100%;
  height: 100%;
}
</style>

