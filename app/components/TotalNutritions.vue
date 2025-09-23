<script setup lang="ts">
import NutritionCard from "./NutritionCard.vue";
interface ITotalNutrients {
  totalCalories: number;
  totalFat: number;
  saturatedFat: number;
  cholesterol: number;
  sodium: number;
  totalCarbohydrate: number;
  dietaryFiber: number;
  sugars: number;
  protein: number;
}

interface ITotalNutritionsProps {
  totalNutrients: ITotalNutrients;
}

const bmrState = useBmr();
const { totalNutrients } = defineProps<ITotalNutritionsProps>();

interface INutritionList {
  label: string;
  value: number;
  unit: string;
  max?: number;
}

const PROTEIN_PER_KCAL = 4,
  FAT_PER_KCAL = 9,
  CARBS_PER_KCAL = 4,
  SUGARS_PER_KCAL = 4,
  MAX_SODIUM = 2300,
  MAX_FAT = 0.3,
  MAX_CARBS = 0.45,
  MAX_PROTEIN = 0.25,
  MAX_SUGARS = 0.1;

const nutritionFacts = computed<INutritionList[]>(() => [
  {
    label: "Calories",
    value: totalNutrients.totalCalories,
    unit: "kcal",
    max: bmrState.value.bmr || 0,
  },
  {
    label: "Fats",
    value: totalNutrients.totalFat,
    unit: "g",
    max: Math.round(((bmrState.value.bmr || 0) * MAX_FAT) / FAT_PER_KCAL),
  },
  {
    label: "Protein",
    value: totalNutrients.protein,
    unit: "g",
    max: Math.round(
      ((bmrState.value.bmr || 0) * MAX_PROTEIN) / PROTEIN_PER_KCAL
    ),
  },
  {
    label: "Carbohydrates",
    value: totalNutrients.totalCarbohydrate,
    unit: "g",
    max: Math.round(((bmrState.value.bmr || 0) * MAX_CARBS) / CARBS_PER_KCAL),
  },
  {
    label: "Sodium",
    value: totalNutrients.sodium,
    unit: "mg",
    max: MAX_SODIUM,
  },
  {
    label: "Sugars",
    value: totalNutrients.sugars,
    unit: "g",
    max: Math.round(((bmrState.value.bmr || 0) * MAX_SUGARS) / SUGARS_PER_KCAL),
  },
]);
</script>

<template>
  <div class="flex justify-center items-center">
    <div
      class="text-center text-2xl mb-4 p-4 bg-slate-300 dark:bg-slate-800 rounded-lg shadow-md items-center justify-center flex-col md:flex-row flex-wrap gap-5 hidden md:flex"
    >
      <NutritionCard
        v-for="nutrition in nutritionFacts"
        :key="nutrition.label"
        :nutrition="nutrition"
      />
    </div>
    <div class="md:hidden flex justify-center w-full">
      <UCarousel
        v-slot="{ item }"
        :items="nutritionFacts"
        :ui="{
          item: 'basis-full',
        }"
        class="w-full"
        arrows
      >
        <div
          class="text-center text-2xl m-4 p-4 bg-slate-300 dark:bg-slate-800 rounded-lg shadow-md flex items-center justify-center flex-col md:flex-row flex-wrap gap-5"
        >
          <NutritionCard :nutrition="item" />
        </div>
      </UCarousel>
    </div>
  </div>
</template>
