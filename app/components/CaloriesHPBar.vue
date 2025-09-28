<script setup lang="ts">
const { bmr } = useBmr().value;
const { aggregatedNutrients } = useAggregatedNutrients();

const defaultMaxBmr = 2000;

const maxBmr = computed(() => (bmr ? bmr : defaultMaxBmr));

const caloriesLeft = computed(() => {
  return bmr
    ? Math.round(bmr - aggregatedNutrients.value.totalCalories)
    : 0;
});

const getCaloriePercentage = () => {
  return (caloriesLeft.value / maxBmr.value) * 100;
};
</script>

<template>
  <div class="text-center text-lg font-bold">
    <span
      :class="
        getCaloriePercentage() > 75
          ? 'dark:text-green-500 text-green-700'
          : getCaloriePercentage() > 50
          ? 'dark:text-yellow-500 text-yellow-700'
          : getCaloriePercentage() > 25
          ? 'dark:text-orange-500 text-orange-700'
          : 'dark:text-red-500 text-red-700'
      "
      >{{ caloriesLeft }}</span
    >
    / {{ maxBmr }} HP
  </div>
  <div class="flex relative flex-wrap items-center w-2xl mx-auto">
    <NuxtImg
      src="/heart.png"
      alt="Heart"
      class="-left-7 absolute z-10 mx-auto h-12 w-12"
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
</template>
