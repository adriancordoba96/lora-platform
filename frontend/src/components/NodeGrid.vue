<template>
  <div
    class="grid-container"
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
    <div class="zoom-controls">
      <v-btn density="compact" icon @click="zoomIn"><v-icon>mdi-plus</v-icon></v-btn>
      <v-btn density="compact" icon @click="zoomOut"><v-icon>mdi-minus</v-icon></v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits, computed } from 'vue'
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
    x: n.x ?? (i % props.perRow) * 250,
    y: n.y ?? Math.floor(i / props.perRow) * 300
  }))
)

watch(
  () => props.nodes,
  val => {
    localNodes.value = val.map((n, i) => ({
      ...n,
      x: n.x ?? (i % props.perRow) * 250,
      y: n.y ?? Math.floor(i / props.perRow) * 300
    }))
  },
  { deep: true }
)

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
const GRID_SIZE = 5

function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

function isColliding(node, x, y) {
  for (const other of localNodes.value) {
    if (other.id !== node.id) {
      if (
        x < other.x + NODE_WIDTH &&
        x + NODE_WIDTH > other.x &&
        y < other.y + NODE_HEIGHT &&
        y + NODE_HEIGHT > other.y
      ) {
        return true
      }
    }
  }
  return false
}

let savedView = {}
try { savedView = JSON.parse(localStorage.getItem('panelView') || '{}') } catch {}
translateX.value = savedView.x || 0
translateY.value = savedView.y || 0
scale.value = savedView.scale || 1

const NODE_WIDTH = 240
const NODE_HEIGHT = 280

const gridWidthPx = computed(() => {
  const max = Math.max(0, ...localNodes.value.map(n => n.x + NODE_WIDTH * props.nodeScale))
  return max + 500
})

const gridHeightPx = computed(() => {
  const max = Math.max(0, ...localNodes.value.map(n => n.y + NODE_HEIGHT * props.nodeScale))
  return max + 500
})

const containerStyle = computed(() => ({}))

watch([translateX, translateY, scale], () => {
  const view = { x: translateX.value, y: translateY.value, scale: scale.value }
  localStorage.setItem('panelView', JSON.stringify(view))
})

const gridStyle = computed(() => ({
  width: gridWidthPx.value + 'px',
  height: gridHeightPx.value + 'px',
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: 'top left'
}))

function getItemStyle(node) {
  return {
    left: node.x + 'px',
    top: node.y + 'px',
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
  const rawX = (e.clientX - rect.left) / scale.value - offsetX.value
  const rawY = (e.clientY - rect.top) / scale.value - offsetY.value
  const snappedX = snapToGrid(rawX)
  const snappedY = snapToGrid(rawY)
  if (!isColliding(dragging.value, snappedX, snappedY)) {
    dragging.value.x = snappedX
    dragging.value.y = snappedY
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
  const rect = gridRef.value.getBoundingClientRect()
  applyZoom(e.clientX, e.clientY, delta, rect)
}

function zoomIn() {
  const rect = gridRef.value.getBoundingClientRect()
  applyZoom(rect.left + rect.width / 2, rect.top + rect.height / 2, 0.1, rect)
}

function zoomOut() {
  const rect = gridRef.value.getBoundingClientRect()
  applyZoom(rect.left + rect.width / 2, rect.top + rect.height / 2, -0.1, rect)
}

function applyZoom(cx, cy, delta, rect) {
  const newScale = Math.min(3, Math.max(0.5, scale.value + delta))
  rect = rect || gridRef.value.getBoundingClientRect()
  const x = (cx - rect.left) / scale.value
  const y = (cy - rect.top) / scale.value
  translateX.value -= x * (newScale - scale.value)
  translateY.value -= y * (newScale - scale.value)
  scale.value = newScale
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
      const newScale = Math.min(3, Math.max(0.5, pinchStartScale * dist / pinchDistance))
      const rect = gridRef.value.getBoundingClientRect()
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top
      const x = midX / scale.value
      const y = midY / scale.value
      translateX.value -= x * (newScale - scale.value)
      translateY.value -= y * (newScale - scale.value)
      scale.value = newScale
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
  background-color: transparent;
  background-image: repeating-linear-gradient(#e0e0e0 0 1px, transparent 1px 5px),
    repeating-linear-gradient(90deg, #e0e0e0 0 1px, transparent 1px 5px);
  background-size: 5px 5px;
}
.grid-item {
  position: absolute;
  cursor: move;
}
.node-card {
  width: 100%;
  height: 100%;
}

.zoom-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}
</style>

