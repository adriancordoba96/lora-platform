<template>
  <v-app>
    <NodeDrawer />

    <v-main>
      <v-container>
        <NodePanel />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import NodeDrawer from '@/components/NodeDrawer.vue'
import NodePanel from '@/components/NodePanel.vue'
</script>

