<script setup lang="ts">
const bmrState = useBmr();
const { aggregatedNutrients } = useAggregatedNutrients();

const defaultMaxBmr = 2000;

const maxBmr = computed(() =>
  bmrState.value.bmr ? bmrState.value.bmr : defaultMaxBmr
);

const caloriesLeft = computed(() => {
  return Math.round(maxBmr.value - aggregatedNutrients.value.totalCalories);
});

const getCaloriePercentage = () => {
  return (caloriesLeft.value / maxBmr.value) * 100;
};

const hpColor = computed(() => {
  const pct = getCaloriePercentage();
  if (pct > 75) return 'green';
  if (pct > 50) return 'yellow';
  if (pct > 25) return 'orange';
  return 'red';
});
</script>

<template>
  <div
    class="sticky flex items-center justify-center top-18 flex-col w-full z-40 select-none pt-4 pb-2"
  >
    <div class="relative flex items-center w-80 md:w-sm lg:w-2xl mx-auto">
      <div class="absolute -left-3 z-10 animate-heartbeat">
        <NuxtImg
          src="/heart.png"
          alt="Heart"
          height="48"
          width="48"
          class="w-10 h-10 md:w-12 md:h-12 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
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
