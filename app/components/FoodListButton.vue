<script setup lang="ts">
interface IButtonProps {
  label: string;
  name: string;
  icon: string;
}

const { label, name, icon } = defineProps<IButtonProps>();
</script>

<template>
  <UButton
    class="btn-gaming px-4 py-2 bg-gaming-700/60 hover:bg-gaming-600/80 active:bg-gaming-500/80 font-semibold text-white text-sm rounded-lg shadow-lg shadow-gaming-900/30 hover:shadow-gaming-500/20 transition-all duration-300 cursor-pointer border border-gaming-600/30 hover:border-gaming-500/50 tracking-wide"
    :label
    :name
    :icon
    :aria-label="label"
  />
</template>
