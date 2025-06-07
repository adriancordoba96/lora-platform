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
  cols: { type: Number, default: 3 }
})

const emit = defineEmits(['update:modelValue', 'update:cols'])

const localOpen = ref(props.modelValue)
const localCols = ref(props.cols)

watch(() => props.modelValue, v => (localOpen.value = v))
watch(() => props.cols, v => (localCols.value = v))
watch(localOpen, v => emit('update:modelValue', v))
watch(localCols, v => emit('update:cols', v))
</script>
