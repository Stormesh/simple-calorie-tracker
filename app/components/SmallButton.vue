<script setup lang="ts">
defineProps<{
  name?: string;
  ariaLabel?: string;
}>();
</script>

<template>
  <button
    class="w-10 h-10 inline-block rounded-lg transition-colors group cursor-pointer"
    :name
    :aria-label
  >
    <slot />
  </button>
</template>
