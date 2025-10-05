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
</script>

<template>
  <div
    class="sticky md:fixed flex items-center justify-center top-2 flex-col w-full z-10 select-none"
  >
    <div
      class="absolute text-center text-lg font-bold z-20 dark:text-shadow-[0_0_3px_#000] select-none"
    >
      <span
        :class="getCaloriePercentage() <= 0 && 'dark:text-red-500 text-red-700'"
        >{{ caloriesLeft }}</span
      >
      / {{ maxBmr }} HP
    </div>
    <div class="flex relative flex-wrap items-center w-80 md:w-sm lg:w-2xl mx-auto">
      <NuxtImg
        src="/heart.png"
        alt="Heart"
        height="48"
        width="48"
        class="-left-5 absolute z-10 mx-auto w-12 h-12"
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
