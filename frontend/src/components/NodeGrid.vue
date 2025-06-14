<template>
  <div
    class="grid-container"
    ref="containerRef"
    :style="containerStyle"
    @wheel.prevent="onWheel"
    @mousedown="startPan"
    @touchstart="onTouchStart"
  >
    <div class="grid" ref="gridRef" :style="gridStyle">
      <div
        v-for="node in localNodes"
        :key="node.id"
        class="grid-item"
        :style="getItemStyle(node)"
        @mousedown.stop="startDrag(node, $event)"
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
        <v-row class="pb-0 justify-center mt-n4">
          <v-col cols="12" class="d-flex justify-center">
            <vue-speedometer
              :value="Number(node.current) || 0"
              :min-value="0"
              :max-value="10"
              :needle-color="'#424242'"
              :ring-width="20"
              :text-color="'#fff'"
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
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits, computed, onMounted, onUnmounted } from 'vue'
import VueSpeedometer from 'vue-speedometer'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  nodeScale: { type: Number, default: 1 },
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

const containerRef = ref(null)
const gridRef = ref(null)
const translateX = ref(0)
const translateY = ref(0)
const scale = ref(1)
const panning = ref(false)
let startPanX = 0
let startPanY = 0
let pinchDistance = 0
let pinchStartScale = 1
const dragging = ref(null)
const offsetX = ref(0)
const offsetY = ref(0)

let savedView = {}
try { savedView = JSON.parse(localStorage.getItem('panelView') || '{}') } catch {}
translateX.value = savedView.x || 0
translateY.value = savedView.y || 0
scale.value = savedView.scale || 1

const NODE_WIDTH = 240
const NODE_HEIGHT = 280
const DEFAULT_GRID = 260
const BASE_SPACING = 20

const nodeWidth = computed(() => NODE_WIDTH * props.nodeScale)
const nodeHeight = computed(() => NODE_HEIGHT * props.nodeScale)

const gridWidth = ref(0)
const gridSize = computed(() => {
  const minSize = nodeWidth.value + BASE_SPACING * props.nodeScale
  if (!gridWidth.value || !props.perRow) return Math.max(minSize, DEFAULT_GRID * props.nodeScale)
  return Math.max(gridWidth.value / props.perRow, minSize)
})
const spacing = computed(() => gridSize.value - nodeWidth.value)
const gridSizeY = computed(() => nodeHeight.value + spacing.value)

const containerStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: 'top left'
}))

function updateGridWidth() {
  gridWidth.value = gridRef.value?.clientWidth || 0
}

onMounted(() => {
  updateGridWidth()
  window.addEventListener('resize', updateGridWidth)
})
onUnmounted(() => window.removeEventListener('resize', updateGridWidth))

watch([translateX, translateY, scale], () => {
  const view = { x: translateX.value, y: translateY.value, scale: scale.value }
  localStorage.setItem('panelView', JSON.stringify(view))
})

const gridStyle = computed(() => ({
  backgroundSize: `${gridSize.value}px ${gridSizeY.value}px`
}))

function getItemStyle(node) {
  const offset = spacing.value / 2
  return {
    left: node.xIndex * gridSize.value + offset + 'px',
    top: node.yIndex * gridSizeY.value + offset + 'px',
    width: NODE_WIDTH + 'px',
    height: NODE_HEIGHT + 'px',
    transform: `scale(${props.nodeScale})`,
    transformOrigin: 'top left'
  }
}

function startDrag(node, e) {
  dragging.value = node
  offsetX.value = e.offsetX / (props.nodeScale * scale.value)
  offsetY.value = e.offsetY / (props.nodeScale * scale.value)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', stopDrag)
}

function onMouseMove(e) {
  if (!dragging.value || !gridRef.value) return
  const rect = gridRef.value.getBoundingClientRect()
  let x = (e.clientX - rect.left) / scale.value - offsetX.value
  let y = (e.clientY - rect.top) / scale.value - offsetY.value
  const maxX = gridRef.value.clientWidth - nodeWidth.value
  const maxY = gridRef.value.clientHeight - nodeHeight.value
  x = Math.max(0, Math.min(x, maxX))
  y = Math.max(0, Math.min(y, maxY))
  const col = Math.round(x / gridSize.value)
  const row = Math.round(y / gridSizeY.value)
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

function startPan(e) {
  if (e.button !== undefined && e.button !== 0) return
  panning.value = true
  startPanX = e.clientX
  startPanY = e.clientY
  document.addEventListener('mousemove', onPanMove)
  document.addEventListener('mouseup', stopPan)
}

function onPanMove(e) {
  if (!panning.value) return
  translateX.value += e.clientX - startPanX
  translateY.value += e.clientY - startPanY
  startPanX = e.clientX
  startPanY = e.clientY
}

function stopPan() {
  panning.value = false
  document.removeEventListener('mousemove', onPanMove)
  document.removeEventListener('mouseup', stopPan)
}

function onWheel(e) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  scale.value = Math.min(3, Math.max(0.5, scale.value + delta))
}

function onTouchStart(e) {
  if (e.touches.length === 1) {
    panning.value = true
    startPanX = e.touches[0].clientX
    startPanY = e.touches[0].clientY
    document.addEventListener('touchmove', onTouchMove)
    document.addEventListener('touchend', onTouchEnd)
  } else if (e.touches.length === 2) {
    pinchDistance = getDistance(e.touches)
    pinchStartScale = scale.value
    document.addEventListener('touchmove', onTouchMove)
    document.addEventListener('touchend', onTouchEnd)
  }
}

function onTouchMove(e) {
  if (e.touches.length === 1 && panning.value) {
    translateX.value += e.touches[0].clientX - startPanX
    translateY.value += e.touches[0].clientY - startPanY
    startPanX = e.touches[0].clientX
    startPanY = e.touches[0].clientY
  } else if (e.touches.length === 2) {
    const dist = getDistance(e.touches)
    if (pinchDistance) {
      scale.value = Math.min(3, Math.max(0.5, pinchStartScale * dist / pinchDistance))
    }
  }
}

function onTouchEnd(e) {
  if (e.touches.length === 0) {
    panning.value = false
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
  }
  if (e.touches.length < 2) {
    pinchDistance = 0
  }
}

function getDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}
</script>

<style scoped>
.grid-container {
  position: relative;
  width: 100%;
  height: 650px;
  overflow: hidden;
}
.grid {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #f5f5f5;
  background-image:
    linear-gradient(to right, #e0e0e0 1px, transparent 1px),
    linear-gradient(to bottom, #e0e0e0 1px, transparent 1px);
}
.grid-item {
  position: absolute;
  width: 240px;
  height: 280px;
  cursor: move;
}
.node-card {
  width: 100%;
  height: 100%;
}
</style>

