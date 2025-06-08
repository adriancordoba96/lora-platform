<template>
  <v-container>
    <v-list>
      <v-list-item v-for="node in nodes" :key="node.id">
        <v-list-item-content>
          <v-list-item-title>{{ node.name }}</v-list-item-title>
          <v-list-item-subtitle>{{ node.identifier }}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-container>
</template>

<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  nodes: { type: Array, default: () => [] }
})
</script>
