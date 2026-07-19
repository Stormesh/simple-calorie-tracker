<script setup lang="ts">
const props = defineProps<{
  modelValue: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: number];
}>();

function decrement() {
  emit(
    "update:modelValue",
    Math.max(0.25, +(props.modelValue - 0.25).toFixed(2)),
  );
}

function increment() {
  emit(
    "update:modelValue",
    Math.min(99, +(props.modelValue + 0.25).toFixed(2)),
  );
}
</script>

<template>
  <div>
    <div
      class="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold"
    >
      Quantity
    </div>
    <div class="flex items-center gap-3 mb-4">
      <button
        class="w-9 h-9 rounded-xl bg-gaming-950/80 border border-gaming-700/40 flex items-center justify-center text-white hover:bg-gaming-700/40 transition-colors"
        @click="decrement"
      >
        <Icon name="heroicons:minus" size="1rem" />
      </button>
      <input
        :value="modelValue"
        type="number"
        min="0.25"
        step="0.25"
        class="w-20 text-center bg-gaming-950/80 border border-gaming-700/40 rounded-xl py-2 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-gaming-500/50 input-gaming"
        @input="
          emit(
            'update:modelValue',
            Number(($event.target as HTMLInputElement).value),
          )
        "
      />
      <button
        class="w-9 h-9 rounded-xl bg-gaming-950/80 border border-gaming-700/40 flex items-center justify-center text-white hover:bg-gaming-700/40 transition-colors"
        @click="increment"
      >
        <Icon name="heroicons:plus" size="1rem" />
      </button>
    </div>
  </div>
</template>
