<template>
  <v-navigation-drawer
    v-model="localOpen"
    :permanent="props.fullPage"
    :absolute="!props.fullPage"
    location="left"
    width="200"
    :class="['settings-drawer', { 'full-page-drawer': props.fullPage }]"
  >
    <v-card flat>
      <v-card-title>Ajustes</v-card-title>
      <v-divider></v-divider>
      <v-list density="comfortable">
        <v-list-item
          v-for="item in items"
          :key="item.value"
          :active="activeItem === item.value"
          @click="activeItem = item.value"
        >
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>
  </v-navigation-drawer>

  <div v-if="props.fullPage || localOpen" class="settings-content" :class="{ 'full-page-content': props.fullPage }">
    <v-card flat class="pa-4">
      <template v-if="activeItem === 'dashboard'">
        <v-slider
          v-model="localCols"
          :min="1"
          :max="4"
          step="1"
          thumb-label
          label="Nodos por fila"
        ></v-slider>

        <v-text-field
          v-model="dashboardName"
          label="Nombre del dashboard"
          class="mt-4"
        ></v-text-field>
        <v-btn color="primary" class="mt-2" @click="save">Guardar actual</v-btn>

        <v-select
          v-model="selectedDash"
          :items="props.dashboards"
          label="Dashboards guardados"
          class="mt-4"
        ></v-select>
        <v-btn class="mt-2" @click="load">Cargar</v-btn>

        <v-select
          v-model="defaultDashLocal"
          :items="props.dashboards"
          label="Dashboard por defecto"
          class="mt-4"
        ></v-select>
      </template>

      <template v-else-if="activeItem === 'general'">
        Ajustes generales próximamente...
      </template>

      <template v-else-if="activeItem === 'alerts'">
        <AlertSettings />
      </template>

      <template v-else-if="activeItem === 'nodes'">
        <NodeSettings
          :nodes="props.nodes"
          :panel-nodes="props.panelNodes"
          @add="emit('add-node', $event)"
          @remove="emit('remove-node', $event)"
          @refresh="emit('refresh-nodes')"
        />
      </template>

      <v-card-actions class="mt-4">
        <v-spacer></v-spacer>
        <v-btn text @click="close">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue'
import { useRouter } from 'vue-router'
import AlertSettings from './AlertSettings.vue'
import NodeSettings from './NodeSettings.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  cols: { type: Number, default: 3 },
  dashboards: { type: Array, default: () => [] },
  defaultDash: { type: String, default: '' },
  nodes: { type: Array, default: () => [] },
  panelNodes: { type: Array, default: () => [] },
  fullPage: { type: Boolean, default: false }
})

const emit = defineEmits([
  'update:modelValue',
  'update:cols',
  'save-dashboard',
  'load-dashboard',
  'update:defaultDash',
  'add-node',
  'remove-node',
  'refresh-nodes'
])

const localOpen = ref(props.modelValue)
const localCols = ref(props.cols)
const dashboardName = ref('')
const selectedDash = ref(props.defaultDash)
const defaultDashLocal = ref(props.defaultDash)
const activeItem = ref('dashboard')
const items = [
  { value: 'general', title: 'General' },
  { value: 'dashboard', title: 'Dashboard' },
  { value: 'alerts', title: 'Alertas' },
  { value: 'nodes', title: 'Nodos' }
]

watch(() => props.modelValue, v => (localOpen.value = v))
watch(() => props.cols, v => (localCols.value = v))
watch(() => props.defaultDash, v => {
  selectedDash.value = v
  defaultDashLocal.value = v
})
watch(localOpen, v => emit('update:modelValue', v))
watch(localCols, v => emit('update:cols', v))
watch(defaultDashLocal, v => emit('update:defaultDash', v))

const save = () => {
  if (dashboardName.value) {
    emit('save-dashboard', dashboardName.value)
    dashboardName.value = ''
  }
}

const load = () => {
  if (selectedDash.value) {
    emit('load-dashboard', selectedDash.value)
  }
}

const router = useRouter()
const close = () => {
  if (props.fullPage) {
    router.back()
  } else {
    localOpen.value = false
  }
}
</script>

<style scoped>
.settings-drawer {
  left: 56px;
  top: 0;
  height: 100%;
  z-index: 1100;
}
.full-page-drawer {
  position: relative;
  left: 0;
  z-index: auto;
}
.settings-content {
  position: fixed;
  left: 256px;
  top: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  background: white;
  z-index: 1100;
}
.full-page-content {
  position: relative;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}
</style>
