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
</script>

<template>
  <div
    class="fixed flex items-center justify-center bottom-2 flex-col w-full z-20 select-none"
  >
    <div
      class="absolute bottom-3 text-center text-lg font-bold z-20 text-shadow-[0_0_3px_#000] select-none"
    >
      <span
        :class="getCaloriePercentage() <= 0 && 'dark:text-red-500 text-red-700'"
        >{{ caloriesLeft }}</span
      >
      / {{ maxBmr }} HP
    </div>
    <div class="flex relative flex-wrap items-center w-80 md:w-2xl mx-auto">
      <NuxtImg
        src="/heart.png"
        alt="Heart"
        class="-left-5 absolute z-10 mx-auto h-12 w-12"
      />
      <UProgress
        v-model="caloriesLeft"
        height="24"
        class="mx-auto my-4"
        size="2xl"
        :max="maxBmr"
        :color="
          getCaloriePercentage() > 75
            ? 'green'
            : getCaloriePercentage() > 50
            ? 'yellow'
            : getCaloriePercentage() > 25
            ? 'orange'
            : 'red'
        "
      />
    </div>
  </div>
</template>
