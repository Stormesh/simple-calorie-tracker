<script setup lang="ts">
import { ModalReset, ModalBMR, FoodLibrary } from "#components";
import type { SettingsPanelAction } from "~/composables/settings-panel";

const overlay = useOverlay();
const toast = useToast();
const { exportBackup, importBackup } = useDataBackup();

const bmrModal = overlay.create(ModalBMR);
const foodLibraryModal = overlay.create(FoodLibrary);
const resetModal = overlay.create(ModalReset);

const { open, closePanel, togglePanel } = useSettingsPanel();

// Hidden picker for the import: Capacitor's WebView routes <input type="file">
// to the Android document picker, which is the one import path that works on
// both the web and in the APK.
const fileInput = ref<HTMLInputElement>();

const handleExport = async () => {
  const result = await exportBackup();

  if (!result.ok) {
    toast.add({
      title: "Export failed",
      description: result.message,
      icon: "heroicons:exclamation-triangle",
    });
    return;
  }

  const summary = result.summary;
  const what = summary
    ? `${summary.days} ${summary.days === 1 ? "day" : "days"}, ${summary.foods} foods, ${summary.customFoods} custom foods`
    : "Backup ready";

  if (result.delivery === "copied") {
    toast.add({
      title: "Backup copied",
      description: "Paste it into a note or into the app on another device.",
      icon: "heroicons:clipboard",
    });
  } else {
    toast.add({
      title: result.delivery === "shared" ? "Backup shared" : "Backup downloaded",
      description: what,
      icon: "heroicons:arrow-down-tray",
    });
  }
};

const handleImport = () => fileInput.value?.click();

const onFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // Reset first: choosing the same file twice must still fire `change`.
  input.value = "";
  if (!file) return;

  const result = importBackup(await file.text());

  if (!result.ok) {
    toast.add({
      title: "Import failed",
      description: result.message,
      icon: "heroicons:exclamation-triangle",
    });
    return;
  }

  const summary = result.summary;
  toast.add({
    title: "Backup restored",
    description: summary
      ? `${summary.days} ${summary.days === 1 ? "day" : "days"} and ${summary.foods} foods`
      : "Everything from the file is in place.",
    icon: "heroicons:check",
  });

  // Charts and the header read day logs outside the reactive graph of the
  // meals, so nudge them once instead of reloading the page.
  notifyWeightChange();
};

const handleSelect = (action: SettingsPanelAction) => {
  // Close the panel first so the modal owns focus and sits alone on screen.
  closePanel();
  if (action === "diet") bmrModal.open();
  else if (action === "library") foodLibraryModal.open();
  else if (action === "backup") void handleExport();
  else if (action === "restore") handleImport();
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

    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="hidden"
      aria-hidden="true"
      tabindex="-1"
      @change="onFileSelected"
    />

    <Teleport to="body">
      <Transition name="settings-backdrop">
        <div
          v-if="open"
          class="fixed inset-x-0 top-[var(--app-header-h)] bottom-0 z-35 bg-black/60 backdrop-blur-sm"
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
