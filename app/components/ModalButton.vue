<script setup lang="ts">
interface IModalButtonProps {
  icon: string;
  label: string;
}

defineProps<IModalButtonProps>();
</script>

<template>
  <UButton
    :icon
    :label
    class="text-lg cursor-pointer bg-slate-600 dark:bg-sky-700 hover:bg-sky-600 active:bg-sky-500 text-white font-bold py-2 px-4 mx-2 rounded-lg"
  />
</template>
