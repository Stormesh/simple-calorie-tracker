<script setup lang="ts">
import FoodDetails from "./components/FoodDetails.vue";

const foodDetailsRef = useTemplateRef("foodDetailsRef");

const foodDetailsElement = computed(
  () => foodDetailsRef.value?.rootElement || null
);

const { aggregatedNutrients } = useAggregatedNutrients();
</script>

<template>
  <UApp>
    <div class="bg-slate-100 dark:bg-slate-900 min-h-screen dark:text-white">
      <NuxtRouteAnnouncer />
      <MyHeader />
      <SettingsMenu />
      <div class="justify-center items-baseline flex-wrap flex">
        <FoodList
          v-for="foodList in foodsList"
          :key="foodList"
          :title="foodList"
          :food-details-ref="foodDetailsElement"
        />
      </div>
      <CaloriesHPBar />
      <FoodDetails ref="foodDetailsRef" />
      <TotalNutritions :total-nutrients="aggregatedNutrients" />
    </div>
  </UApp>
</template>
