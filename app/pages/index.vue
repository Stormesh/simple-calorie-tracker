<script setup lang="ts">
const foodDetailsRef = useTemplateRef("foodDetailsRef");

const foodDetailsElement = computed(() => foodDetailsRef.value?.rootElement || null);

const { aggregatedNutrients } = useAggregatedNutrients();

onMounted(() => {
  migrateCookieData();
  const currentDateCookie = useCookie<string>("current-date");
  if (currentDateCookie.value && currentDateCookie.value !== getTodayString()) {
    restoreDayToCookies(currentDateCookie.value);
  }

  window.addEventListener("beforeunload", () => {
    const cd = useCookie<string>("current-date").value;
    if (cd) saveDayToStorage(cd);
  });
});
</script>

<template>
  <div>
    <DaySelector />
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
    <DailyCharts />
  </div>
</template>
