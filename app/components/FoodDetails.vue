<script setup lang="ts">
const foodData = foodDetails;
const rootElement = ref<Element | null>(null);

defineExpose({
  rootElement,
});
</script>

<template>
  <div ref="rootElement" class="flex justify-center items-center">
    <div class="m-4 w-md">
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
            foodData.serving_weight_grams +
            "g"
          }}
        </h1>
        <div class="bg-slate-300 dark:bg-slate-800 rounded-b-xl p-4">
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 md:text-lg">
            <div class="font-bold text-right">Calories:</div>
            <div>{{ foodData.nf_calories }}kcal</div>

            <div class="font-bold text-right">Total Fat:</div>
            <div>{{ foodData.nf_total_fat }}g</div>

            <div class="font-bold text-right">Saturated Fat:</div>
            <div>{{ foodData.nf_saturated_fat }}g</div>

            <div class="font-bold text-right">Cholesterol:</div>
            <div>{{ foodData.nf_cholesterol }}mg</div>

            <div class="font-bold text-right">Sodium:</div>
            <div>{{ foodData.nf_sodium }}mg</div>

            <div class="font-bold text-right">Total Carbohydrate:</div>
            <div>{{ foodData.nf_total_carbohydrate }}g</div>

            <div class="font-bold text-right">Dietary Fiber:</div>
            <div>{{ foodData.nf_dietary_fiber }}g</div>

            <div class="font-bold text-right">Sugars:</div>
            <div>{{ foodData.nf_sugars }}g</div>

            <div class="font-bold text-right">Protein:</div>
            <div>{{ foodData.nf_protein }}g</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
