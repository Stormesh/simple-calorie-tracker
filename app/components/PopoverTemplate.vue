<script setup lang="ts">
interface IFoodPopoverProps {
  title: string
}

const { title } = defineProps<IFoodPopoverProps>();
const open = defineModel<boolean>("open", {
  default: () => false
});
</script>

<template>
    <UPopover
      v-model:open="open"
      :ui="{
        content:
          'bg-slate-300 dark:bg-slate-800 rounded-lg shadow-md ring-0',
      }"
    >
      <slot name="trigger" />
      <template #content>
        <h1 class="text-2xl text-center text-white font-extrabold bg-slate-500 dark:bg-sky-700 rounded-t-lg">{{ title }}</h1>
        <slot name="content" />
      </template>
    </UPopover>
</template>