<script setup lang="ts">
const bmrState = useBmr();
const { aggregatedNutrients } = useAggregatedNutrients();

const defaultMaxBmr = 2000;

const maxBmr = computed(() => (bmrState.value.bmr ? bmrState.value.bmr : defaultMaxBmr));

const caloriesLeft = computed(() => {
  return Math.round(maxBmr.value - aggregatedNutrients.value.totalCalories);
});

const getCaloriePercentage = () => {
  return (caloriesLeft.value / maxBmr.value) * 100;
};

const hpColor = computed(() => {
  const pct = getCaloriePercentage();
  if (pct > 75) return "green";
  if (pct > 50) return "yellow";
  if (pct > 25) return "orange";
  return "red";
});

const heartStyle = computed(() => {
  const pct = getCaloriePercentage();
  const clampedPct = Math.max(0, Math.min(100, pct));
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
        <div class="relative glass-light rounded-full p-0.5 hp-bar glow-border">
          <UProgress
            v-model="caloriesLeft"
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
            <span :class="getCaloriePercentage() <= 0 ? 'text-hp-red' : 'text-gaming-300'">
              {{ caloriesLeft }}
            </span>
            <span class="text-white/40"> / {{ maxBmr }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
