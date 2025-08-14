<script setup lang="ts">
import FoodDetails from "./components/FoodDetails.vue";
import FoodList from "./components/FoodList.vue";
import ResetButton from "./components/ResetCookies.vue";

const foodLists = ["Breakfast", "Lunch", "Dinner", "Snacks"];

const cookieNames = foodLists.map((foodList) => `foods-${foodList}`);

type foodListType = InstanceType<typeof FoodList>;

const foodListRef = ref<foodListType[]>([]);
const foodDetailsRef = useTemplateRef("foodDetailsRef");

const foodDetailsElement = computed(
  () => foodDetailsRef.value?.rootElement || null
);

const totalCalories = computed(() => {
  return foodListRef.value.reduce((total, foodList) => {
    return total + foodList.totalCalories;
  }, 0);
});
</script>

<template>
  <UApp>
    <Head>
      <Title>MaxHP - Level up your health</Title>
      <Meta
        name="description"
        content="MaxHP is a simple but effective calorie tracker to level up your health. Track your food and see how many calories you have consumed."
      />
      <Meta name="og:image" content="/maxhp_side.png" />
      <Meta name="twitter:image" content="/maxhp_side.png" />
    </Head>
    <div class="bg-slate-100 dark:bg-slate-900 min-h-screen dark:text-white">
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
      <div class="flex justify-center items-center">
        <h2 class="text-center text-2xl mt-4 p-4 bg-slate-300 dark:bg-slate-800 rounded-lg shadow-md">
          <span class="font-bold">Total Calories: </span
          >{{ Math.round(totalCalories) }}kcal
        </h2>
      </div>
      <FoodDetails ref="foodDetailsRef" />
      <div class="flex justify-center">
        <ResetButton :cookie-names="cookieNames" />
      </div>
    </div>
  </UApp>
</template>
