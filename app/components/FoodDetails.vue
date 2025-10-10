<script setup lang="ts">
const { foodDetails, isValidQuantity, isFoodLoading } = useFoodDetails();
const rootElement = ref<Element | null>(null);

defineExpose({
  rootElement,
});
</script>

<template>
  <div ref="rootElement" class="flex justify-center items-center">
    <div class="w-sm max-w-md">
      <div v-if="isFoodLoading" class="flex justify-center items-center">
        <icon name="line-md:loading-loop" size="5rem" />
      </div>
      <div v-else-if="foodDetails">
        <h1
          class="text-2xl bg-slate-500 dark:bg-sky-700 rounded-t-xl text-white text-center font-black"
        >
          {{
            (isValidQuantity ? foodDetails.serving_qty + " " : "") +
            (foodDetails.food_name.charAt(0).toUpperCase() +
              foodDetails.food_name.slice(1)) +
            " " +
            (foodDetails.serving_weight_grams ?? "0")
          }}g
        </h1>
        <div class="bg-slate-300 dark:bg-slate-800 rounded-b-xl p-2">
          <FoodDetailsList />
        </div>
      </div>
    </div>
  </div>
</template>
