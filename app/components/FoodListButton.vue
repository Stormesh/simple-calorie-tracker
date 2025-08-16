<script setup lang="ts">
interface ButtonProps {
  label: string;
  name: string;
  icon: string;
  onButtonClick: () => void;
}

const { label, name, icon, onButtonClick } = defineProps<ButtonProps>();
</script>

<template>
  <UButton
    class="mx-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 active:bg-slate-400 dark:bg-sky-700 dark:hover:bg-sky-600 dark:active:bg-sky-500 font-bold translate-y-2 hover:translate-y-0 transition-all text-white text-lg rounded-none rounded-t-xl cursor-pointer"
    :label
    :name
    :icon
    :aria-label="label"
    @click="onButtonClick"
  />
</template>
