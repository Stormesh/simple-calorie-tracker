<script setup lang="ts">
const foodData = foodDetails;
const rootElement = ref<Element | null>(null);

interface INutritionFacts {
  label: string;
  value?: number;
  unit: string;
}

const nutritionFacts = computed<INutritionFacts[]>(() => [
  { label: "Calories", value: foodData.value?.nf_calories, unit: "kcal" },
  { label: "Fat", value: foodData.value?.nf_total_fat, unit: "g" },
  { label: "Cholesterol", value: foodData.value?.nf_cholesterol, unit: "mg" },
  { label: "Sodium", value: foodData.value?.nf_sodium, unit: "mg" },
  {
    label: "Carbohydrates",
    value: foodData.value?.nf_total_carbohydrate,
    unit: "g",
  },
  { label: "Sugars", value: foodData.value?.nf_sugars, unit: "g" },
  { label: "Protein", value: foodData.value?.nf_protein, unit: "g" },
]);

defineExpose({
  rootElement,
});
</script>

<template>
  <div ref="rootElement" class="flex justify-center items-center">
    <div class="m-4 w-sm max-w-md">
      <div v-if="isFoodLoading" class="flex justify-center items-center">
        <icon name="line-md:loading-loop" size="5rem" />
      </div>
      <div v-else-if="foodData && !isFoodLoading">
        <h1
          class="text-2xl bg-slate-500 dark:bg-sky-700 rounded-t-xl text-white text-center font-black"
        >
          {{
            (foodData.serving_qty > 1 ? foodData.serving_qty + " " : "") +
            (foodData.food_name.charAt(0).toUpperCase() +
              foodData.food_name.slice(1)) +
            " " +
            foodData.serving_weight_grams
          }}g
        </h1>
        <div class="bg-slate-300 dark:bg-slate-800 rounded-b-xl p-2">
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 md:text-lg">
            <template v-for="(fact, index) in nutritionFacts" :key="index">
              <div class="font-bold text-right">{{ fact.label }}:</div>
              <div>{{ Math.round(fact.value || 0) + fact.unit }}</div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
