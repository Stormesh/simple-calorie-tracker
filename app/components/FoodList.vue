<script setup lang="ts">
interface FoodProps {
  title: string;
  foodDetailsRef: Element | null;
}

interface IFoodTemplate {
  foodName: string;
  calories: number;
}

const foodTemplate = () => ({
  foodName: "",
  calories: 0,
});

const foodLength = 6,
  maxFoods = 10;

const { title, foodDetailsRef } = defineProps<FoodProps>();

const foods = useCookie<IFoodTemplate[]>(`foods-${title}`, {
  default: () => {
    return Array.from({ length: foodLength }, foodTemplate);
  },
});

const foodLoadingStates = ref<boolean[]>(Array(foods.value.length).fill(false));

const maxFoodsReached = computed(() => {
  return foods.value.length >= maxFoods;
});

const toast = useToast();

const showToast = (title: string, description: string, icon: string) => {
  toast.add({
    title,
    description,
    icon,
  });
};

watch(
  () => foods.value.length,
  (newLength) => {
    foodLoadingStates.value.length = newLength;
    foodLoadingStates.value.fill(
      false,
      newLength - (newLength - foods.value.length)
    );
  }
);

const totalCalories = computed(() => {
  return foods.value.reduce((total, food) => {
    if (food.foodName.trim() === "") food.calories = 0;
    return total + food.calories;
  }, 0);
});

defineExpose({
  totalCalories,
});

const deleteItem = (index: number) => {
  // Allow deletion but ensure there's always at least one item

  if (foods.value.length <= 1) {
    const firstFood = foods.value[0];
    // If trying to delete the last item, just clear it instead
    if (!firstFood) return;
    firstFood.foodName = "";
    firstFood.calories = 0;
    return;
  }

  foods.value.splice(index, 1);
};

const addItem = () => {
  if (maxFoodsReached.value) {
    return showToast(
      "Max Foods Reached",
      `You can only add up to ${maxFoods} foods for ${title}`,
      "ic:outline-error"
    );
  }
  foods.value.push(foodTemplate());
};

const resetFood = () => {
  foods.value.forEach((food) => {
    food.foodName = "";
    food.calories = 0;
  });
};

const changeFoodDetails = async (index: number, scroll: boolean = false) => {
  const foodItem = foods.value[index];
  if (!foodItem) return;

  foodLoadingStates.value[index] = true;

  const foodName = foodItem.foodName || "";
  const details = await searchFood(foodName);
  if (details) {
    foodDetails.value = details;
    foodItem.calories = details.nf_calories;
    if (scroll) foodDetailsRef?.scrollIntoView({ behavior: "smooth" });
  }

  foodLoadingStates.value[index] = false;
};
</script>

<template>
  <div class="m-4 flex-col flex justify-center">
    <h1
      class="text-2xl bg-slate-500 dark:bg-sky-700 rounded-t-xl text-white text-center font-black"
    >
      {{ title }}
    </h1>
    <div class="bg-slate-300 dark:bg-slate-800 rounded-b-xl shadow-md">
      <div v-for="(food, index) in foods" :key="index">
        <div class="py-1.5 mx-2">
          <div
            class="h-10 flex relative bg-stone-50 dark:bg-slate-900 rounded-lg overflow-hidden shadow"
          >
            <form
              class="container inline-block p-2"
              @submit.prevent
              @submit="changeFoodDetails(index)"
            >
              <input
                v-model="food.foodName"
                class="focus:outline-none focus:placeholder-shown:scale-110 focus:placeholder-shown:translate-x-3 transition-transform container"
                type="text"
                name="foodName"
                aria-label="Enter food"
                placeholder="Enter food"
              >
            </form>
            <button
              class="min-h-fit inline-block hover:bg-teal-600 active:bg-teal-500 transition-colors group cursor-pointer"
              name="showFoodDetails"
              aria-label="Show food details"
              @click="changeFoodDetails(index, true)"
            >
              <Icon
                name="ic:outline-keyboard-arrow-down"
                size="2.5rem"
                class="text-black group-hover:text-white dark:text-white group-hover:translate-y-1 transition-transform duration-150"
              />
            </button>
            <button
              class="min-h-fit inline-block hover:bg-rose-800 active:bg-rose-700 transition-colors group cursor-pointer"
              name="deleteFood"
              aria-label="Delete food"
              @click="deleteItem(index)"
            >
              <Icon
                name="ic:outline-delete"
                size="2.5rem"
                class="text-black group-hover:text-white dark:text-white group-hover:scale-110 transition-all duration-150"
              />
            </button>
          </div>
          <div
            v-if="foodLoadingStates[index]"
            class="flex justify-center items-center"
          >
            <Icon name="line-md:loading-loop" size="2rem" />
          </div>
          <div v-else-if="food.calories > 0" class="grid grid-cols-2">
            <div class="font-bold text-center">Calories:</div>
            <div>{{ food.calories }}kcal</div>
          </div>
        </div>
      </div>
      <div class="flex justify-center overflow-hidden">
        <FoodListButton
          label="Add food"
          name="addFood"
          icon="ic:outline-plus"
          @button-click="addItem"
        />
        <FoodListButton
          label="Reset"
          name="resetFood"
          icon="heroicons:arrow-path"
          @button-click="resetFood"
        />
      </div>
    </div>
    <div>
      <div class="grid grid-cols-1 text-xl text-center">
        <div class="font-bold">Calories:</div>
        <div>{{ Math.round(totalCalories) }}kcal</div>
      </div>
    </div>
  </div>
</template>
