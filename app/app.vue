<script setup lang="ts">
import FoodDetails from "./components/FoodDetails.vue";
import FoodList from "./components/FoodList.vue";
const foodLists = ["Breakfast", "Lunch", "Dinner", "Snacks"];

const foodListRef = ref<InstanceType<typeof FoodList>[]>([]);

const foodDetailsRef = ref<InstanceType<typeof FoodDetails> | null>(null);

const foodDetailsElement = computed(() => foodDetailsRef.value?.rootElement || null);

  const totalCalories = computed(() => {
  return foodListRef.value.reduce((total, foodList) => {
    return total + foodList.totalCalories;
  }, 0);
})
</script>

<template>
  <Head>
    <Title>MaxHP - Level up your health</Title>
    <Meta name="description" content="MaxHP - Level up your health" />
  </Head>
  <div class="bg-slate-100 min-h-screen">
    <NuxtRouteAnnouncer />
    <MyHeader />
    <div class="flex justify-center items-baseline flex-wrap">
      <FoodList
        v-for="(foodList, index) in foodLists"
        :key="foodList"
        :ref="(el) => {if (el) foodListRef[index] = el as InstanceType<typeof FoodList>}"
        :title="foodList"
        :food-details-ref="foodDetailsElement"
      />
    </div>
    <h2 class="text-center text-2xl"><span class="font-bold">Total Calories: </span>{{ Math.round(totalCalories) }}kcal</h2>
    <FoodDetails ref="foodDetailsRef" />
  </div>
</template>
