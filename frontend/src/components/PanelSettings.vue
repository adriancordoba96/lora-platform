<template>
  <v-dialog v-model="localOpen" max-width="400">
    <v-card>
      <v-card-title>Panel Settings</v-card-title>
  <v-card-text>
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
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="localOpen = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  cols: { type: Number, default: 3 },
  dashboards: { type: Array, default: () => [] },
  defaultDash: { type: String, default: '' }
})

const emit = defineEmits([
  'update:modelValue',
  'update:cols',
  'save-dashboard',
  'load-dashboard',
  'update:defaultDash'
])

const localOpen = ref(props.modelValue)
const localCols = ref(props.cols)
const dashboardName = ref('')
const selectedDash = ref(props.defaultDash)
const defaultDashLocal = ref(props.defaultDash)

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
</script>
