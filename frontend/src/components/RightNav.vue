<template>
  <v-navigation-drawer rail location="right" permanent>
    <v-list>
      <v-list-item
        v-for="item in items"
        :key="item.value"
        :active="item.value === modelValue"
        @click="selectItem(item)"
        density="comfortable"
        :title="item.title"
      >
        <template #prepend>
          <v-icon>{{ item.icon }}</v-icon>
        </template>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: 'panel' }
})

const emit = defineEmits(['update:modelValue', 'open-settings'])

const items = [
  { value: 'panel', icon: 'mdi-view-dashboard', title: 'Dashboard' },
  { value: 'nodes', icon: 'mdi-chip', title: 'Tus nodos' },
  { value: 'list', icon: 'mdi-format-list-bulleted', title: 'Lista de nodos' },
  { value: 'settings', icon: 'mdi-cog', title: 'Ajustes' }
]

const selectItem = (item) => {
  if (item.value === 'settings') {
    emit('open-settings')
  } else {
    emit('update:modelValue', item.value)
  }
}
</script>
