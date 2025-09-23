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
      <div class="hidden justify-center items-baseline flex-wrap md:flex">
        <FoodList
          v-for="foodList in foodsList"
          :key="foodList"
          :title="foodList"
          :food-details-ref="foodDetailsElement"
        />
      </div>
      <div class="md:hidden">
        <UCarousel
          v-slot="{ item }"
          :items="foodsList"
          :ui="{
            item: 'basis-full',
          }"
        >
          <FoodList
            :key="item"
            :title="item"
            :food-details-ref="foodDetailsElement"
          />
        </UCarousel>
      </div>
      <FoodDetails ref="foodDetailsRef" />
      <TotalNutritions :total-nutrients="aggregatedNutrients" />
    </div>
  </UApp>
</template>
