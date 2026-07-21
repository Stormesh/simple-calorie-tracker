<script setup lang="ts">
const foodData = foodDetails;
const rootElement = ref<Element | null>(null);

interface INutritionFacts {
  label: string;
  value?: number;
  unit: string;
}

const serving = computed(() => {
  if (!foodData.value || !foodData.value.servings.serving.length) return null;
  if (selectedServingId.value) {
    const match = foodData.value.servings.serving.find(
      (s) => s.serving_id === selectedServingId.value,
    );
    if (match) return match;
  }
  return foodData.value.servings.serving[0] ?? null;
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
    <div class="m-4 w-sm max-w-md animate-fade-in-up">
      <div v-if="isFoodLoading" class="flex justify-center items-center py-12">
        <Icon name="line-md:loading-loop" size="3rem" class="text-gaming-400" />
      </div>
      <div v-else-if="foodData && !isFoodLoading">
        <div
          class="section-header text-lg md:text-xl font-black text-gaming-400 text-center py-2 px-6 rounded-t-xl bg-gaming-950/60 border-t border-x border-gaming-700/30 tracking-widest"
        >
          <span class="glow-text">
            {{ foodData.food_name.charAt(0).toUpperCase() + foodData.food_name.slice(1) }}
          </span>
          <span
            v-if="foodData.brand_name === 'Custom Food'"
            class="ml-2 text-[10px] uppercase tracking-wider text-gaming-500 font-semibold"
            >Custom</span
          >
          <span class="text-white/40 text-sm font-mono ml-2">
            {{
              (isValidQuantity ? serving?.number_of_units + " " : "") +
              serving?.metric_serving_amount
            }}g
          </span>
        </div>
        <div class="glass-light rounded-b-xl rounded-t-none p-4 shadow-lg shadow-gaming-950/40">
          <div class="grid grid-cols-2 gap-3">
            <template v-for="(fact, index) in nutritionFacts" :key="index">
              <div
                class="flex flex-col items-center p-2 rounded-lg bg-gaming-950/40 border border-gaming-800/20"
              >
                <span class="text-xs font-mono text-gaming-400 uppercase tracking-wider">{{
                  fact.label
                }}</span>
                <span class="text-base font-bold text-white"
                  >{{ Math.round(fact.value || 0)
                  }}<span class="text-xs text-gaming-400 ml-0.5">{{ fact.unit }}</span></span
                >
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
