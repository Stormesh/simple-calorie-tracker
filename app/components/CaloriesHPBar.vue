<script setup lang="ts">
const bmrState = useBmr();
const { aggregatedNutrients } = useAggregatedNutrients();

const defaultMaxBmr = 2000;

const maxBmr = computed(() => (bmrState.value.bmr ? bmrState.value.bmr : defaultMaxBmr));

const caloriesLeft = computed(() => {
  return Math.round(maxBmr.value - aggregatedNutrients.value.totalCalories);
});

const isOverTarget = computed(() => caloriesLeft.value < 0);

const overage = computed(() => Math.abs(caloriesLeft.value));

const percentage = computed(() => {
  const raw = (caloriesLeft.value / maxBmr.value) * 100;
  return Math.max(0, Math.min(100, raw));
});

// Red is reserved for "over target" only — running low on budget stays
// cautionary (orange) rather than looking like failure.
const hpColor = computed(() => {
  if (isOverTarget.value) return "var(--color-hp-red)";
  if (percentage.value > 75) return "var(--color-hp-green)";
  if (percentage.value > 50) return "var(--color-hp-yellow)";
  return "var(--color-hp-orange)";
});

const heartStyle = computed(() => {
  const clampedPct = percentage.value;
  const factor = 1 - clampedPct / 100;

  const duration = 0.35 + (clampedPct / 100) * 1.15;
  const glowRestSize = 6 + factor * 14;
  const glowRestOpacity = 0.3 + factor * 0.4;
  const glowPeakSize = 8 + factor * 22;
  const glowPeakOpacity = 0.8 + factor * 0.2;

  return {
    animationDuration: `${duration.toFixed(2)}s`,
    "--glow-rest-size": `${Math.round(glowRestSize)}px`,
    "--glow-rest-opacity": glowRestOpacity.toFixed(2),
    "--glow-peak-size": `${Math.round(glowPeakSize)}px`,
    "--glow-peak-opacity": glowPeakOpacity.toFixed(2),
  };
});
</script>

<template>
  <div
    class="sticky flex items-center justify-center top-18 flex-col w-full z-40 select-none pt-4 pb-2"
  >
    <div class="relative flex items-center w-80 md:w-sm lg:w-2xl mx-auto">
      <div class="absolute -left-3 z-10 animate-heart" :style="heartStyle">
        <NuxtImg
          src="/heart_small.png"
          alt="Heart"
          height="52"
          width="52"
          class="w-10 h-10 md:w-12 md:h-12"
        />
      </div>
      <div class="flex-1 ml-6">
        <div
          class="relative glass-light rounded-full p-0.5 hp-bar"
          :class="isOverTarget ? 'hp-bar-over glow-border-red' : 'glow-border'"
        >
          <UProgress
            :model-value="caloriesLeft"
            height="20"
            class="rounded-full overflow-hidden"
            size="2xl"
            :max="maxBmr"
            :color="hpColor"
          />
        </div>
        <div class="flex justify-between mt-1 px-1">
          <span class="text-xs font-semibold text-white/60 font-mono tracking-wider">HP</span>
          <span class="text-xs font-bold text-white/80 font-mono tracking-wider">
            <template v-if="isOverTarget">
              <span class="text-hp-orange">+{{ overage }} over</span>
            </template>
            <template v-else>
              <span class="text-gaming-300">{{ caloriesLeft }}</span>
              <span class="text-white/40"> / {{ maxBmr }}</span>
            </template>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
