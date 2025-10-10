<script setup lang="ts">
import FoodDetails from '~/components/FoodDetails.vue';

const foodDetailsRef = useTemplateRef("foodDetailsRef");

const foodDetailsElement = computed(
  () => foodDetailsRef.value?.rootElement || null
);

const { aggregatedNutrients } = useAggregatedNutrients();

const cardMode = useCardMode();
</script>

<template>
  <div>
    <CaloriesHPBar />
    <div class="justify-center items-baseline flex-wrap flex mx-30">
      <FoodList
        v-for="foodList in foodsList"
        :key="foodList"
        :title="foodList"
        :food-details-ref="foodDetailsElement"
      />
    </div>
    <FoodDetails v-if="!cardMode" ref="foodDetailsRef" class="m-4" />
    <TotalNutritions :total-nutrients="aggregatedNutrients" />
  </div>
</template>
