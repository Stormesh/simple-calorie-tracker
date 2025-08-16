<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import ResetModal from "./ResetModal.vue";

const overlay = useOverlay();

const modal = overlay.create(ResetModal);

const open = () => {
  modal.open({
    cookieNames: foodsList.map((foodList) => `foods-${foodList}`),
  });
};

const items = ref<DropdownMenuItem[]>([
  {
    label: "Reset",
    name: "reset",
    icon: "heroicons:arrow-path",
    onSelect: () => {
      open();
    },
  },
]);
</script>

<template>
  <UDropdownMenu
    arrow
    :ui="{
      content: 'bg-slate-100 dark:bg-slate-700 rounded-lg shadow-md',
    }"
    :items="items"
  >
    <SettingsButton />
  </UDropdownMenu>
</template>
