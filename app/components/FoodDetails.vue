<script setup lang="ts">
const foodData = foodDetails;
const rootElement = ref<Element | null>(null);

interface INutritionFacts {
  label: string;
  value?: number;
  unit: string;
}

const serving = computed<IFoodServing | null>(() => {
  if (!foodData.value || !foodData.value.servings.serving[0])
    return null;
  return foodData.value.servings.serving[0];
});

const nutritionFacts = computed<INutritionFacts[]>(() => [
  { label: "Calories", value: serving.value?.calories, unit: "kcal" },
  { label: "Fat", value: serving.value?.fat, unit: "g" },
  { label: "Cholesterol", value: serving.value?.cholesterol, unit: "mg" },
  { label: "Sodium", value: serving.value?.sodium, unit: "mg" },
  {
    label: "Carbohydrates",
    value: serving.value?.carbohydrate,
    unit: "g",
  },
  { label: "Sugars", value: serving.value?.sugar, unit: "g" },
  { label: "Protein", value: serving.value?.protein, unit: "g" },
]);

defineExpose({
  rootElement,
});

const isValidQuantity = computed(() => {
  if (!foodData.value) return false;
  const qty = serving.value?.number_of_units || 1;
  const weight = serving.value?.metric_serving_amount || 0;
  if (qty && qty <= 1) return false;
  if (weight === null) return true;
  // Check if qty is not "near" the weight. "Near" is defined as a difference of less than 10.
  return Math.abs(qty - weight) >= 10;
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
            (isValidQuantity ? serving?.number_of_units + " " : "") +
            (foodData.food_name.charAt(0).toUpperCase() +
              foodData.food_name.slice(1)) +
            " " +
            serving?.metric_serving_amount
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
