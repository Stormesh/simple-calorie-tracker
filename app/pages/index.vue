<script setup lang="ts">
import FoodDetails from '~/components/FoodDetails.vue';

const foodDetailsRef = useTemplateRef("foodDetailsRef");

const foodDetailsElement = computed(
  () => foodDetailsRef.value?.rootElement || null
);

const { aggregatedNutrients } = useAggregatedNutrients();
</script>

<template>
  <div>
    <CaloriesHPBar />
    <div class="justify-center items-baseline flex-wrap flex">
      <FoodList
        v-for="foodList in foodsList"
        :key="foodList"
        :title="foodList"
        :food-details-ref="foodDetailsElement"
      />
    </div>
    <FoodDetails ref="foodDetailsRef" />
    <TotalNutritions :total-nutrients="aggregatedNutrients" />
  </div>
</template>
