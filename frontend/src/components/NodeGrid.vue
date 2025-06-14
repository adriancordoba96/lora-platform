<template>
  <div
    class="grid-container"
    ref="containerRef"
    :style="containerStyle"
    @wheel.prevent="onWheel"
    @mousedown="onContainerMouseDown"
    @touchstart="onTouchStart"
  >
    <div class="grid" ref="gridRef" :style="gridStyle">
      <div
        v-for="node in localNodes"
        :key="node.id"
        class="grid-item"
        :class="{ selected: selectedNodes.has(node.id) }"
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
    <div v-if="selection.active" class="selection-rect" :style="selectionStyle"></div>
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
resolveCollisions()

watch(
  () => props.nodes,
  val => {
    localNodes.value = val.map((n, i) => ({
      ...n,
      x: n.x ?? (i % props.perRow) * 250,
      y: n.y ?? Math.floor(i / props.perRow) * 300
    }))
    resolveCollisions()
  },
  { deep: true }
)

const containerRef = ref(null)
const gridRef = ref(null)
const selectedNodes = ref(new Set())
const selection = ref({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 })
const translateX = ref(0)
const translateY = ref(0)
const scale = ref(1)
const panning = ref(false)
let startPanX = 0
let startPanY = 0
let pinchDistance = 0
let pinchStartScale = 1
const dragData = ref(null)
const GRID_SIZE = 5

function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

function isColliding(node, x, y) {
  for (const other of localNodes.value) {
    if (other.id !== node.id) {
      if (
        x + NODE_WIDTH > other.x - NODE_SPACING &&
        x - NODE_SPACING < other.x + NODE_WIDTH &&
        y + NODE_HEIGHT > other.y - NODE_SPACING &&
        y - NODE_SPACING < other.y + NODE_HEIGHT
      ) {
        return true
      }
    }
  }
  return false
}

function findNearestPosition(node, x, y) {
  const start = { x: snapToGrid(x), y: snapToGrid(y) }
  const queue = [start]
  const visited = new Set([`${start.x},${start.y}`])
  while (queue.length) {
    const pos = queue.shift()
    if (!isColliding(node, pos.x, pos.y)) return pos
    const neighbors = [
      { x: pos.x + GRID_SIZE, y: pos.y },
      { x: pos.x - GRID_SIZE, y: pos.y },
      { x: pos.x, y: pos.y + GRID_SIZE },
      { x: pos.x, y: pos.y - GRID_SIZE }
    ]
    for (const n of neighbors) {
      const key = `${n.x},${n.y}`
      if (!visited.has(key)) {
        visited.add(key)
        queue.push(n)
      }
    }
  }
  return start
}

function resolveCollisions() {
  for (const node of localNodes.value) {
    const pos = findNearestPosition(node, node.x, node.y)
    node.x = pos.x
    node.y = pos.y
  }
  emit('update:nodes', localNodes.value)
}

let savedView = {}
try { savedView = JSON.parse(localStorage.getItem('panelView') || '{}') } catch {}
translateX.value = savedView.x || 0
translateY.value = savedView.y || 0
scale.value = savedView.scale || 1

const NODE_WIDTH = 240
const NODE_HEIGHT = 280
const NODE_SPACING = NODE_WIDTH * 0.05

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

const selectionStyle = computed(() => {
  if (!selection.value.active) return {}
  const x = Math.min(selection.value.startX, selection.value.endX)
  const y = Math.min(selection.value.startY, selection.value.endY)
  const w = Math.abs(selection.value.endX - selection.value.startX)
  const h = Math.abs(selection.value.endY - selection.value.startY)
  return { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' }
})

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

function onContainerMouseDown(e) {
  if (e.button === 1) {
    startPan(e)
  } else if (e.button === 0) {
    startSelection(e)
  }
}

function startSelection(e) {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  selection.value = {
    active: true,
    startX: e.clientX - rect.left,
    startY: e.clientY - rect.top,
    endX: e.clientX - rect.left,
    endY: e.clientY - rect.top
  }
  document.addEventListener('mousemove', onSelectionMove)
  document.addEventListener('mouseup', endSelection)
}

function onSelectionMove(e) {
  if (!selection.value.active || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  selection.value.endX = e.clientX - rect.left
  selection.value.endY = e.clientY - rect.top
}

function endSelection() {
  if (!selection.value.active || !containerRef.value || !gridRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const gridRect = gridRef.value.getBoundingClientRect()
  const x1 = Math.min(selection.value.startX, selection.value.endX) + rect.left
  const y1 = Math.min(selection.value.startY, selection.value.endY) + rect.top
  const x2 = Math.max(selection.value.startX, selection.value.endX) + rect.left
  const y2 = Math.max(selection.value.startY, selection.value.endY) + rect.top
  const gx1 = (x1 - gridRect.left) / scale.value
  const gy1 = (y1 - gridRect.top) / scale.value
  const gx2 = (x2 - gridRect.left) / scale.value
  const gy2 = (y2 - gridRect.top) / scale.value
  selectedNodes.value = new Set(
    localNodes.value
      .filter(
        n => gx1 < n.x + NODE_WIDTH && gx2 > n.x && gy1 < n.y + NODE_HEIGHT && gy2 > n.y
      )
      .map(n => n.id)
  )
  selection.value.active = false
  document.removeEventListener('mousemove', onSelectionMove)
  document.removeEventListener('mouseup', endSelection)
}

function startDrag(node, e) {
  if (e.button !== 0) return
  if (!selectedNodes.value.has(node.id)) {
    selectedNodes.value = new Set([node.id])
  }
  const nodes = [...selectedNodes.value].map(id => {
    const n = localNodes.value.find(n => n.id === id)
    return { node: n, startX: n.x, startY: n.y }
  })
  dragData.value = { startX: e.clientX, startY: e.clientY, nodes }
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', stopDrag)
}

function onMouseMove(e) {
  if (!dragData.value) return
  const dx = (e.clientX - dragData.value.startX) / scale.value
  const dy = (e.clientY - dragData.value.startY) / scale.value
  dragData.value.nodes.forEach(d => {
    const snappedX = snapToGrid(d.startX + dx)
    const snappedY = snapToGrid(d.startY + dy)
    if (!isColliding(d.node, snappedX, snappedY)) {
      d.node.x = snappedX
      d.node.y = snappedY
    }
  })
}

function stopDrag() {
  if (dragData.value) emit('update:nodes', localNodes.value)
  dragData.value = null
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
  if (e.button !== undefined && e.button !== 1) return
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
.grid-item.selected {
  outline: 2px solid #42a5f5;
}
.selection-rect {
  position: absolute;
  border: 1px dashed #42a5f5;
  background-color: rgba(66, 165, 245, 0.2);
  pointer-events: none;
  z-index: 9;
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

