<script setup lang="ts">
import type FoodList from "./FoodList.vue";

const bmrState = useBmr();

type foodListType = InstanceType<typeof FoodList>;

interface TotalNutritionsProps {
  foodListRef: foodListType[];
}

const { foodListRef } = defineProps<TotalNutritionsProps>();

const totalNutrients = computed(() => {
  return foodListRef.values().reduce(
    (total, foodList) => {
      return {
        totalCalories:
          total.totalCalories + foodList.totalNutrients.totalCalories,
        totalFat: total.totalFat + foodList.totalNutrients.totalFat,
        sodium: total.sodium + foodList.totalNutrients.sodium,
        totalCarbohydrate:
          total.totalCarbohydrate + foodList.totalNutrients.totalCarbohydrate,
        sugars: total.sugars + foodList.totalNutrients.sugars,
        protein: total.protein + foodList.totalNutrients.protein,
      };
    },
    {
      totalCalories: 0,
      totalFat: 0,
      sodium: 0,
      totalCarbohydrate: 0,
      sugars: 0,
      protein: 0,
    }
  );
});

interface NutritionList {
  label: string;
  value: number;
  unit: string;
  max?: number | null;
}

const PROTEIN_PER_KCAL = 4;
const FAT_PER_KCAL = 9;
const CARBS_PER_KCAL = 4;
const SUGARS_PER_KCAL = 4;
const MAX_SODIUM = 2300;
const MAX_FAT = 0.3;
const MAX_CARBS = 0.45;
const MAX_PROTEIN = 0.25;
const MAX_SUGARS = 0.1;

const nutritionFacts = computed<NutritionList[]>(() => [
  {
    label: "Calories",
    value: totalNutrients.value.totalCalories,
    unit: "kcal",
    max: bmrState.value.bmr,
  },
  {
    label: "Fats",
    value: totalNutrients.value.totalFat,
    unit: "g",
    max: Math.round(((bmrState.value.bmr || 0) * MAX_FAT) / FAT_PER_KCAL),
  },
  {
    label: "Protein",
    value: totalNutrients.value.protein,
    unit: "g",
    max: Math.round(
      ((bmrState.value.bmr || 0) * MAX_PROTEIN) / PROTEIN_PER_KCAL
    ),
  },
  {
    label: "Carbohydrates",
    value: totalNutrients.value.totalCarbohydrate,
    unit: "g",
    max: Math.round(((bmrState.value.bmr || 0) * MAX_CARBS) / CARBS_PER_KCAL),
  },
  {
    label: "Sodium",
    value: totalNutrients.value.sodium,
    unit: "mg",
    max: MAX_SODIUM,
  },
  {
    label: "Sugars",
    value: totalNutrients.value.sugars,
    unit: "g",
    max: Math.round(((bmrState.value.bmr || 0) * MAX_SUGARS) / SUGARS_PER_KCAL),
  },
]);
</script>

<template>
  <div class="flex justify-center items-center">
    <div
      class="text-center text-2xl mb-4 p-4 bg-slate-300 dark:bg-slate-800 rounded-lg shadow-md flex items-center justify-center flex-col md:flex-row flex-wrap gap-5"
    >
      <h2 v-for="nutrition in nutritionFacts" :key="nutrition.label">
        <span
          :class="
            nutrition.value > (nutrition.max ?? 0)
              ? 'dark:text-red-500 text-red-700'
              : 'dark:text-green-500 text-green-700'
          "
          >{{ Math.round(nutrition.value) }}{{ nutrition.unit }}</span
        >
        <template v-if="nutrition.max">
          / {{ nutrition.max }}{{ nutrition.unit }}
        </template>
        <span
          class="font-light block"
          :class="nutrition.label === 'Calories' ? 'text-xl' : 'text-base'"
          >{{ nutrition.label }}</span
        >
      </h2>
    </div>
  </div>
</template>
