<template>
  <v-container
    class="pa-0 d-flex map-wrapper"
    style="position: relative; height: 750px; width: 100%; margin-top: 16px;"
  >
    <div class="group-panel">
      <v-list density="compact">
        <v-list-item v-for="g in groups" :key="g" class="px-2">
          <v-checkbox
            v-model="selectedGroups"
            :value="g"
            :label="g"
            hide-details
            density="compact"
            color="primary"
          />
        </v-list-item>
      </v-list>
    </div>
    <div class="map-container">
      <v-select
        v-model="currentTile"
        :items="tiles.map(t => t.name)"
        class="map-select"
        hide-details
        density="compact"
        variant="outlined"
        bg-color="white"
        color="black"
        :menu-props="{ contentClass: 'map-select-menu' }"
      />
      <div ref="mapRef" style="height: 100%; width: 100%;"></div>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, defineProps, onMounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import api from '@/plugins/axios'

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

const currentTile = ref(tiles[1].name)
const activeTile = computed(() => tiles.find(t => t.name === currentTile.value))

const groups = computed(() => {
  const all = props.nodes.map(n => n.group || 'Sin Grupo')
  return [...new Set(all)]
})

const selectedGroups = ref([])

watch(groups, g => {
  selectedGroups.value = [...g]
})

const nodesWithCoords = computed(() =>
  props.nodes
    .filter(n => selectedGroups.value.includes(n.group || 'Sin Grupo'))
    .map(n => {
      if (!n.location) return null
      const [lat, lng] = n.location.split(',').map(Number)
      if (isNaN(lat) || isNaN(lng)) return null
      return { ...n, coords: [lat, lng] }
    })
    .filter(Boolean)
)

let savedView = {}
try { savedView = JSON.parse(localStorage.getItem('mapView') || '{}') } catch {}
const center = ref(savedView.center || [0, 0])
const zoom = ref(savedView.zoom || 5)
let hasSavedView = Boolean(savedView.center)

const mapRef = ref(null)
let map
let tileLayer
let markerLayer
let zoneLayer
let drawControl
const zones = ref([])

async function fetchZones() {
  try {
    const res = await api.get('/zones')
    zones.value = res.data || []
    updateZones()
  } catch (err) {
    console.error('❌ Error cargando zonas:', err)
  }
}

function updateZones() {
  if (!zoneLayer) return
  zoneLayer.clearLayers()
  zones.value.forEach(z => {
    const poly = L.polygon(z.polygon, { color: 'red' }).addTo(zoneLayer)
    poly.bindPopup(z.name)
    poly.zoneId = z.id
  })
}

function updateMarkers() {
  if (!markerLayer) return
  markerLayer.clearLayers()
  nodesWithCoords.value.forEach(n => {
    L.marker(n.coords).addTo(markerLayer).bindPopup(n.name)
  })
  if (nodesWithCoords.value.length && !hasSavedView) {
    map.setView(nodesWithCoords.value[0].coords, zoom.value)
  }
}

onMounted(() => {
  map = L.map(mapRef.value).setView(center.value, zoom.value)
  tileLayer = L.tileLayer(activeTile.value.url, { attribution: activeTile.value.attribution }).addTo(map)
  markerLayer = L.layerGroup().addTo(map)
  zoneLayer = L.featureGroup().addTo(map)
  updateMarkers()
  fetchZones()
  drawControl = new L.Control.Draw({ edit: { featureGroup: zoneLayer } })
  map.addControl(drawControl)
  const saveView = () => {
    const view = { center: [map.getCenter().lat, map.getCenter().lng], zoom: map.getZoom() }
    localStorage.setItem('mapView', JSON.stringify(view))
    hasSavedView = true
  }
  map.on('moveend', saveView)
  map.on('zoomend', saveView)
  map.on(L.Draw.Event.CREATED, async e => {
    if (e.layerType === 'polygon') {
      const latlngs = e.layer.getLatLngs()[0].map(ll => [ll.lat, ll.lng])
      const name = prompt('Nombre de la zona') || 'Zona'
      try {
        const res = await api.post('/zones', { name, polygon: latlngs })
        e.layer.addTo(zoneLayer)
        e.layer.zoneId = res.data.id
        e.layer.bindPopup(name)
        zones.value.push({ id: res.data.id, name, polygon: latlngs })
      } catch (err) {
        console.error('❌ Error guardando zona:', err)
      }
    }
  })
  map.on(L.Draw.Event.DELETED, async e => {
    e.layers.eachLayer(async layer => {
      try { await api.delete(`/zones/${layer.zoneId}`) } catch (err) { console.error('❌ Error borrando zona:', err) }
    })
  })
})

watch(currentTile, () => {
  if (tileLayer) {
    tileLayer.setUrl(activeTile.value.url)
  }
})

watch(nodesWithCoords, updateMarkers)
watch(selectedGroups, updateMarkers)
</script>

<style scoped>
.map-select {
  position: absolute;
  top: 8px;
  right: 8px;
  max-width: 150px;
  z-index: 1000;
}

.map-select-menu {
  background-color: white;
  color: black;
}

.map-select-menu .v-list-item-title {
  color: black;
}

.group-panel {
  width: 200px;
  background: white;
  overflow-y: auto;
  z-index: 1000;
}

.map-container {
  position: relative;
  flex: 1;
}
</style>
