<template>
  <div class="semi-gauge">
    <svg viewBox="0 0 100 50" class="gauge-svg">
      <path d="M10 50 A40 40 0 0 1 90 50" class="gauge-bg" />
      <line x1="50" y1="50" x2="50" y2="15" class="gauge-needle" :transform="`rotate(${rotation} 50 50)`" />
    </svg>
    <div class="gauge-label">{{ value }} A</div>
  </div>
</template>

<script setup>
import { computed, defineProps } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 10 }
})

const rotation = computed(() => (props.value / props.max) * 180 - 90)
</script>

<style scoped>
.semi-gauge {
  width: 100%;
  text-align: center;
}
.gauge-svg {
  width: 100%;
  max-width: 120px;
  display: block;
  margin: auto;
}
.gauge-bg {
  fill: none;
  stroke: #ccc;
  stroke-width: 5;
}
.gauge-needle {
  stroke: #f44336;
  stroke-width: 2;
  transform-origin: 50px 50px;
}
.gauge-label {
  margin-top: -5px;
  font-size: 0.8rem;
}
</style>
