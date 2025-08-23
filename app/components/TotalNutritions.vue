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

interface nutritionList {
  label: string;
  value: number;
  unit: string;
  max?: number | null;
}

const nutritionFacts = computed<nutritionList[]>(() => [
  {
    label: "Calories",
    value: totalNutrients.value.totalCalories,
    unit: "kcal",
    max: bmrState.value.bmr,
  },
  { label: "Fats", value: totalNutrients.value.totalFat, unit: "g" },
  { label: "Sodium", value: totalNutrients.value.sodium, unit: "mg" },
  {
    label: "Carbohydrates",
    value: totalNutrients.value.totalCarbohydrate,
    unit: "g",
  },
  { label: "Sugars", value: totalNutrients.value.sugars, unit: "g" },
  { label: "Protein", value: totalNutrients.value.protein, unit: "g" },
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
            nutrition.label === 'Calories' &&
            nutrition.value > (nutrition.max ?? 0)
              ? 'dark:text-red-500 text-red-700'
              : nutrition.label === 'Calories' &&
                nutrition.value <= (nutrition.max ?? 0)
              ? 'dark:text-green-500 text-green-700'
              : ''
          "
          >{{ Math.round(nutrition.value) }}{{ nutrition.unit }}</span
        >
        <template v-if="nutrition.label === 'Calories' && nutrition.max">
          / {{ nutrition.max }}{{ nutrition.unit }}
        </template>
        <span class="font-light block" :class="nutrition.label === 'Calories' ? 'text-xl' : 'text-base'">{{ nutrition.label }}</span>
      </h2>
    </div>
  </div>
</template>
