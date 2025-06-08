<template>
  <v-container>
    <v-select
      v-model="currentTile"
      :items="tiles.map(t => t.name)"
      label="Capa de mapa"
      class="mb-2"
    />
    <div ref="mapRef" style="height: 500px; width: 100%;"></div>
  </v-container>
</template>

<script setup>
import { ref, computed, defineProps, onMounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  nodes: { type: Array, default: () => [] }
})

const tiles = [
  {
    name: 'Est\u00e1ndar',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  },
  {
    name: 'Satelite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles \u00a9 Esri'
  }
]

const currentTile = ref(tiles[0].name)
const activeTile = computed(() => tiles.find(t => t.name === currentTile.value))

const nodesWithCoords = computed(() =>
  props.nodes
    .map(n => {
      if (!n.location) return null
      const [lat, lng] = n.location.split(',').map(Number)
      if (isNaN(lat) || isNaN(lng)) return null
      return { ...n, coords: [lat, lng] }
    })
    .filter(Boolean)
)

const center = computed(() => nodesWithCoords.value[0]?.coords || [0, 0])
const zoom = ref(5)

const mapRef = ref(null)
let map
let tileLayer
let markerLayer

function updateMarkers() {
  if (!markerLayer) return
  markerLayer.clearLayers()
  nodesWithCoords.value.forEach(n => {
    L.marker(n.coords).addTo(markerLayer).bindPopup(n.name)
  })
  if (nodesWithCoords.value.length) {
    map.setView(nodesWithCoords.value[0].coords, zoom.value)
  }
}

onMounted(() => {
  map = L.map(mapRef.value).setView(center.value, zoom.value)
  tileLayer = L.tileLayer(activeTile.value.url, { attribution: activeTile.value.attribution }).addTo(map)
  markerLayer = L.layerGroup().addTo(map)
  updateMarkers()
})

watch(currentTile, () => {
  if (tileLayer) {
    tileLayer.setUrl(activeTile.value.url)
  }
})

watch(nodesWithCoords, updateMarkers)
</script>
