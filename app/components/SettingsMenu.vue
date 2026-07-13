<script setup lang="ts">
import { ModalReset, ModalBMR, FoodLibrary } from "#components";
import type { DropdownMenuItem } from "@nuxt/ui";
const overlay = useOverlay();

const resetModal = overlay.create(ModalReset);
const bmrModal = overlay.create(ModalBMR);
const foodLibraryModal = overlay.create(FoodLibrary);

const resetOpen = () => {
  resetModal.open();
};

const bmrOpen = () => {
  bmrModal.open();
};

const foodLibraryOpen = () => {
  foodLibraryModal.open();
};

const items = ref<DropdownMenuItem[]>([
  {
    label: "My Food Library",
    icon: "mdi:food-apple",
    class: "cursor-pointer",
    onSelect: () => {
      foodLibraryOpen();
    },
  },
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
  <div>
    <UDropdownMenu
      arrow
      :ui="{
        content:
          'bg-gaming-950/90 backdrop-blur-xl border border-gaming-700/30 rounded-xl shadow-2xl shadow-gaming-900/50 text-white',
        item: 'hover:bg-gaming-800/50 text-white data-[highlighted]:bg-gaming-700/50 rounded-lg mx-1',
      }"
      :items="items"
    >
      <UButton
        icon="mdi:gear"
        size="lg"
        class="cursor-pointer bg-gaming-700/80 hover:bg-gaming-600 text-white p-2.5 rounded-xl shadow-lg shadow-gaming-900/50 hover:shadow-gaming-500/30 transition-all duration-300 hover:scale-105 active:scale-95 animate-pulse-glow"
        aria-label="Settings"
      />
    </UDropdownMenu>
  </div>
</template>
