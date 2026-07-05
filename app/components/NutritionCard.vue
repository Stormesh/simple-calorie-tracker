<script setup lang="ts">
interface INutrition {
  label: string;
  value: number;
  unit: string;
  max?: number;
}

interface INutritionCardProps {
  nutrition: INutrition;
}

defineProps<INutritionCardProps>();
</script>

<template>
  <div
    :class="nutrition.max && Math.round(nutrition.value) > nutrition.max ? 'stat-card-over' : 'stat-card'"
    class="flex flex-col items-center p-4 min-w-[120px] rounded-xl bg-gaming-950/50 border border-gaming-800/20 hover:border-gaming-600/40 transition-all duration-300 hover:shadow-lg hover:shadow-gaming-900/30"
  >
    <div class="flex items-baseline gap-1">
      <span
        :class="
          nutrition.max && Math.round(nutrition.value) > nutrition.max
            ? 'text-hp-red'
            : 'text-gaming-400'
        "
        class="text-2xl font-black font-mono"
      >{{ Math.round(nutrition.value) }}</span>
      <span class="text-xs text-white/40 font-mono">{{ nutrition.unit }}</span>
    </div>
    <div v-if="nutrition.max" class="flex items-baseline gap-1 mt-0.5">
      <span class="text-xs text-white/30 font-mono">/ {{ nutrition.max }}<span class="text-[10px]">{{ nutrition.unit }}</span></span>
    </div>
    <span
      class="text-xs font-semibold text-gaming-400 uppercase tracking-widest mt-1.5"
    >{{ nutrition.label }}</span>
    <div v-if="nutrition.max" class="w-full mt-2 h-1 rounded-full bg-gaming-950/80 overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-500"
        :class="Math.round(nutrition.value) > nutrition.max ? 'bg-gradient-to-r from-hp-red to-red-600' : 'bg-gradient-to-r from-gaming-500 to-gaming-400'"
        :style="{ width: `${Math.min((nutrition.value / nutrition.max) * 100, 100)}%` }"
      />
    </div>
  </div>
</template>
