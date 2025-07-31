<script setup lang="ts">
const foodData = foodDetails;
</script>

<template>
  <div class="flex justify-center items-center">
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
          <div class="grid grid-cols-2 gap-2 text-xl">
            <div class="font-bold">Calories:</div>
            <div>{{ foodData.nf_calories }}</div>
  
            <div class="font-bold">Total Fat:</div>
            <div>{{ foodData.nf_total_fat }}g</div>
  
            <div class="font-bold">Saturated Fat:</div>
            <div>{{ foodData.nf_saturated_fat }}g</div>
  
            <div class="font-bold">Cholesterol:</div>
            <div>{{ foodData.nf_cholesterol }}mg</div>
  
            <div class="font-bold">Sodium:</div>
            <div>{{ foodData.nf_sodium }}mg</div>
  
            <div class="font-bold">Total Carbohydrate:</div>
            <div>{{ foodData.nf_total_carbohydrate }}g</div>
  
            <div class="font-bold">Dietary Fiber:</div>
            <div>{{ foodData.nf_dietary_fiber }}g</div>
  
            <div class="font-bold">Sugars:</div>
            <div>{{ foodData.nf_sugars }}g</div>
  
            <div class="font-bold">Protein:</div>
            <div>{{ foodData.nf_protein }}g</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
