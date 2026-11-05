<script setup lang="ts">
const foodDetailsRef = useTemplateRef("foodDetailsRef");

const foodDetailsElement = computed(() => foodDetailsRef.value?.rootElement || null);

const { aggregatedNutrients } = useAggregatedNutrients();

onMounted(() => {
  // Order matters: the cookie→localStorage move must land before the
  // "save what the last session left behind" step reads the meals, otherwise
  // a browser upgrading from the cookie build would save four blank rows.
  migrateMealFoods();
  migrateUnsavedMeals();
  const currentDate = useCurrentDateCookie();
  const today = getTodayString();

  if (currentDate.value !== today) {
    // Fill the meal storage from the stored log for the stored date first:
    // after a browser restart the meals may be empty, and switching below
    // would otherwise save empty foods over that day's stored log.
    restoreDayToMeals(currentDate.value, false);
  }

  if (currentDate.value < today) {
    // The stored date is stale — the app was closed across midnight (or
    // for several days) and nothing else will advance it: the rollover
    // watcher only reacts to clock *changes*, which never happen on a
    // fresh load, and the focus catch-up never fires on load either.
    // Resume on the current day, mirroring the in-session rollover;
    // switchDate saves the restored foods back before advancing.
    switchDate(today);
  }

  // Persist the open day whenever the app can be taken away from us. Android
  // kills the WebView process without firing `beforeunload`, so that listener
  // alone lost the day's snapshot (charts and exports lagged behind the meals,
  // which live in localStorage). `pagehide` covers the native shell and Safari,
  // `visibilitychange` covers backgrounding on Android and mobile browsers.
  let lastFlush: string | null = null;
  const flushDay = () => {
    const date = useCurrentDateCookie().value;
    const snapshot = JSON.stringify([date, foodsList.map((meal) => useMealFoods(meal).value)]);
    // Cheap guard: `beforeunload` and `pagehide` fire together on the web, and
    // `visibilitychange` fires on every tab switch — each would otherwise
    // rewrite the whole log map in localStorage for nothing.
    if (snapshot === lastFlush) return;
    lastFlush = snapshot;
    saveDayToStorage(date);
  };

  window.addEventListener("beforeunload", flushDay);
  window.addEventListener("pagehide", flushDay);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushDay();
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
