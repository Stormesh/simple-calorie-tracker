<script setup lang="ts">
interface INutritionFacts {
  label: string;
  value?: number;
  unit: string;
}

const { foodDetails } = useFoodDetails();

const nutritionFacts = computed<INutritionFacts[]>(() => [
  { label: "Calories", value: foodDetails.value?.nf_calories, unit: "kcal" },
  { label: "Fat", value: foodDetails.value?.nf_total_fat, unit: "g" },
  { label: "Sodium", value: foodDetails.value?.nf_sodium, unit: "mg" },
  {
    label: "Carbohydrates",
    value: foodDetails.value?.nf_total_carbohydrate,
    unit: "g",
  },
  { label: "Sugars", value: foodDetails.value?.nf_sugars, unit: "g" },
  { label: "Protein", value: foodDetails.value?.nf_protein, unit: "g" },
]);
</script>

<template>
  <div class="grid grid-cols-2 gap-x-4 gap-y-1 md:text-lg">
    <template v-for="(fact, index) in nutritionFacts" :key="index">
      <div class="font-bold text-right">{{ fact.label }}:</div>
      <div>{{ Math.round(fact.value || 0) + fact.unit }}</div>
    </template>
  </div>
</template>
