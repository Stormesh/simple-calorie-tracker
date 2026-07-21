<script setup lang="ts">
const emit = defineEmits<{ close: [boolean] }>();

const resetDone = ref(false);
const dayLogs = useDayLogs();

const resetFoods = () => {
  if (resetDone.value) return;
  dayLogs.resetDay();
  resetDone.value = true;
  window.location.reload();
};
</script>

<template>
  <ModalTemplate title="Reset">
    <div class="flex flex-col items-center gap-2 py-2">
      <Icon name="mdi:alert-octagon" size="3rem" class="text-hp-orange" />
      <p class="text-base text-white/80 text-center">Are you sure you want to reset all foods?</p>
      <p class="text-xs text-white/40 text-center">This action cannot be undone</p>
    </div>
    <div class="flex justify-center gap-4 mt-2">
      <UButton
        icon="heroicons:check"
        label="Yes, Reset"
        class="btn-gaming text-sm cursor-pointer bg-hp-red/80 hover:bg-hp-red text-white font-bold py-2 px-5 rounded-xl shadow-lg shadow-gaming-900/50 border border-hp-red/30 transition-all"
        @click="resetFoods"
      />
      <UButton
        icon="heroicons:x-mark"
        label="Cancel"
        class="btn-gaming text-sm cursor-pointer bg-gaming-950/60 hover:bg-gaming-700/60 text-white font-bold py-2 px-5 rounded-xl border border-gaming-700/30 transition-all"
        @click="emit('close', false)"
      />
    </div>
  </ModalTemplate>
</template>
