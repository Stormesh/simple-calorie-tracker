<script setup lang="ts">
import FoodDetails from "./components/FoodDetails.vue";
import FoodList from "./components/FoodList.vue";
import TotalNutritions from "./components/TotalNutritions.vue";

type foodListType = InstanceType<typeof FoodList>;

const foodListRef = ref<foodListType[]>([]);
const foodDetailsRef = useTemplateRef("foodDetailsRef");

const foodDetailsElement = computed(
  () => foodDetailsRef.value?.rootElement || null
);
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
      <SettingsMenu />
      <div class="flex justify-center items-baseline flex-wrap">
        <FoodList
          v-for="(foodList, index) in foodsList"
          :key="foodList"
          :ref="(el) => {if (el) foodListRef[index] = el as InstanceType<typeof FoodList>}"
          :title="foodList"
          :food-details-ref="foodDetailsElement"
        />
      </div>
      <FoodDetails ref="foodDetailsRef" />
      <TotalNutritions :food-list-ref="foodListRef" />
    </div>
  </UApp>
</template>
