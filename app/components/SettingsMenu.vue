<script setup lang="ts">
import { ModalReset, ModalBMR, FoodLibrary } from "#components";
import type { SettingsPanelAction } from "~/composables/settings-panel";

const overlay = useOverlay();

const bmrModal = overlay.create(ModalBMR);
const foodLibraryModal = overlay.create(FoodLibrary);
const resetModal = overlay.create(ModalReset);

const { open, closePanel, togglePanel } = useSettingsPanel();

const handleSelect = (action: SettingsPanelAction) => {
  // Close the panel first so the modal owns focus and sits alone on screen.
  closePanel();
  if (action === "diet") bmrModal.open();
  else if (action === "library") foodLibraryModal.open();
  else resetModal.open();
};

watch(open, (isOpen) => {
  if (import.meta.client) {
    document.body.style.overflow = isOpen ? "hidden" : "";
  }
});

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = "";
  }
});
</script>

<template>
  <div>
    <UButton
      :icon="open ? 'heroicons:x-mark' : 'mdi:gear'"
      size="lg"
      class="cursor-pointer bg-gaming-700/80 p-2.5 text-white rounded-xl shadow-lg shadow-gaming-900/50 transition-all duration-300 hover:bg-gaming-600 hover:shadow-gaming-500/30 hover:scale-105 active:scale-95 animate-pulse-glow"
      :aria-label="open ? 'Close settings' : 'Settings'"
      @click="togglePanel"
    />

    <Teleport to="body">
      <Transition name="settings-backdrop">
        <div
          v-if="open"
          class="fixed inset-x-0 top-16 bottom-0 z-35 bg-black/60 backdrop-blur-sm"
          aria-hidden="true"
          @click="closePanel"
        />
      </Transition>
      <Transition name="settings-panel">
        <SettingsPanel v-if="open" @close="closePanel" @select="handleSelect" />
      </Transition>
    </Teleport>
  </div>
</template>
