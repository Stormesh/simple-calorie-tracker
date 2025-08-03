<script setup lang="ts">
const foodData = foodDetails;
const rootElement = ref<Element | null>(null);

defineExpose({
  rootElement,
});
</script>

<template>
  <div ref="rootElement" class="flex justify-center items-center">
    <div class="m-4 w-lg">
      <div v-if="isFoodLoading" class="flex justify-center items-center">
        <icon
          name="line-md:loading-loop"
          size="5rem"
        />
      </div>
      <div v-else-if="foodData && !isFoodLoading">
        <h1
          class="text-2xl bg-slate-500 rounded-t-xl text-white text-center font-black"
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
        <div class="bg-slate-300 rounded-b-xl p-4">
          <div class="grid grid-cols-2 gap-1 text-lg">
            <div class="font-bold text-center">Calories:</div>
            <div>{{ foodData.nf_calories }}kcal</div>
  
            <div class="font-bold text-center">Total Fat:</div>
            <div>{{ foodData.nf_total_fat }}g</div>
  
            <div class="font-bold text-center">Saturated Fat:</div>
            <div>{{ foodData.nf_saturated_fat }}g</div>
  
            <div class="font-bold text-center">Cholesterol:</div>
            <div>{{ foodData.nf_cholesterol }}mg</div>
  
            <div class="font-bold text-center">Sodium:</div>
            <div>{{ foodData.nf_sodium }}mg</div>
  
            <div class="font-bold text-center">Total Carbohydrate:</div>
            <div>{{ foodData.nf_total_carbohydrate }}g</div>
  
            <div class="font-bold text-center">Dietary Fiber:</div>
            <div>{{ foodData.nf_dietary_fiber }}g</div>
  
            <div class="font-bold text-center">Sugars:</div>
            <div>{{ foodData.nf_sugars }}g</div>
  
            <div class="font-bold text-center">Protein:</div>
            <div>{{ foodData.nf_protein }}g</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
