<script setup lang="ts">
import { ResetModal, BMRModal } from "#components";
import type { DropdownMenuItem } from "@nuxt/ui";
const overlay = useOverlay();

const resetModal = overlay.create(ResetModal);
const bmrModal = overlay.create(BMRModal);

const resetOpen = () => {
  resetModal.open({
    cookieNames: foodsList.map((foodList) => `foods-${foodList}`),
  });
};

const bmrOpen = () => {
  bmrModal.open();
};

const items = ref<DropdownMenuItem[]>([
  {
    label: "Reset",
    icon: "heroicons:arrow-path",
    class: "cursor-pointer",
    onSelect: () => {
      resetOpen();
    },
  },
  {
    label: "Diet Profile",
    icon: "heroicons:scale",
    class: "cursor-pointer",
    onSelect: () => {
      bmrOpen();
    },
  },
]);
</script>

<template>
  <div class="sticky z-10 top-0">
    <UDropdownMenu
      arrow
      :ui="{
        content: 'bg-slate-100 dark:bg-slate-800 rounded-lg shadow-md',
      }"
      :items="items"
    >
      <UButton
        icon="mdi:gear"
        size="xl"
        class="cursor-pointer text-lg m-2 bg-slate-600 hover:bg-slate-500 active:bg-slate-400 dark:bg-sky-700 dark:hover:bg-sky-600 dark:active:bg-sky-500 text-white font-bold p-2 rounded-lg absolute right-0"
        aria-label="Settings"
      />
    </UDropdownMenu>
  </div>
</template>
