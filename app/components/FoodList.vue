<script setup lang="ts">
interface IFoodProps {
  title: string;
  foodDetailsRef: Element | null;
}

export interface IFoodTemplate {
  foodName: string;
  calories: number;
  totalFat: number;
  saturatedFat: number;
  cholesterol: number;
  sodium: number;
  totalCarbohydrate: number;
  dietaryFiber: number;
  sugars: number;
  protein: number;
}

interface IFoodState {
  loading: boolean;
  focused: boolean;
}

const foodTemplateDefault = () => ({
  foodName: "",
  calories: 0,
  totalFat: 0,
  saturatedFat: 0,
  cholesterol: 0,
  sodium: 0,
  totalCarbohydrate: 0,
  dietaryFiber: 0,
  sugars: 0,
  protein: 0,
});

const FOOD_LENGTH = 4,
  MAX_FOODS = 10;

const { title, foodDetailsRef } = defineProps<IFoodProps>();

const foods = useCookie<IFoodTemplate[]>(`foods-${title}`, {
  default: () => {
    return Array.from({ length: FOOD_LENGTH }, foodTemplateDefault);
  },
});

const foodStateDefault = () => ({
  loading: false,
  focused: false,
});

const foodStates = ref<IFoodState[]>(
  Array.from({ length: foods.value.length }, foodStateDefault)
);

const maxFoodsReached = computed(() => {
  return foods.value.length >= MAX_FOODS;
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
    foodStates.value = Array.from({ length: newLength }, foodStateDefault);
  }
);

const resetFood = (index: number) => {
  const food = foods.value[index] as IFoodTemplate;
  Object.assign(food, foodTemplateDefault());
};

const resetFoodIfEmpty = (index: number) => {
  const food = foods.value[index];
  if (food?.foodName.trim() === "") {
    resetFood(index);
  }
};

const totalNutrients = computed(() => {
  return foods.value.reduce(
    (totals, food) => {
      return {
        totalCalories: totals.totalCalories + food.calories,
        totalFat: totals.totalFat + food.totalFat,
        saturatedFat: totals.saturatedFat + food.saturatedFat,
        cholesterol: totals.cholesterol + food.cholesterol,
        sodium: totals.sodium + food.sodium,
        totalCarbohydrate: totals.totalCarbohydrate + food.totalCarbohydrate,
        dietaryFiber: totals.dietaryFiber + food.dietaryFiber,
        sugars: totals.sugars + food.sugars,
        protein: totals.protein + food.protein,
      };
    },
    {
      totalCalories: 0,
      totalFat: 0,
      saturatedFat: 0,
      cholesterol: 0,
      sodium: 0,
      totalCarbohydrate: 0,
      dietaryFiber: 0,
      sugars: 0,
      protein: 0,
    }
  );
});

defineExpose({
  totalNutrients,
});

const deleteItem = (index: number) => {
  // Allow deletion but ensure there's always at least one item

  if (foods.value.length <= 1) {
    // If trying to delete the last item, just clear it instead
    resetFood(0);
    return;
  }

  foods.value.splice(index, 1);
};

const addItem = () => {
  if (maxFoodsReached.value) {
    return showToast(
      "Max Foods Reached",
      `You can only add up to ${MAX_FOODS} foods for ${title}`,
      "ic:outline-error"
    );
  }
  foods.value.push(foodTemplateDefault());
};

const resetFoods = () => {
  foods.value.forEach((food) => {
    resetFood(foods.value.indexOf(food));
  });
};

const changeFoodDetails = async (index: number, scroll: boolean = false) => {
  const foodItem = foods.value[index],
    foodState = foodStates.value[index];
  if (!foodItem || !foodState) return;

  foodState.loading = true;

  const foodName = foodItem.foodName || "";
  const details = await searchFood(foodName);
  if (details) {
    foodDetails.value = details;
    foodItem.calories = details.nf_calories;
    foodItem.totalFat = details.nf_total_fat;
    foodItem.sodium = details.nf_sodium;
    foodItem.totalCarbohydrate = details.nf_total_carbohydrate;
    foodItem.cholesterol = details.nf_cholesterol;
    foodItem.sugars = details.nf_sugars;
    foodItem.protein = details.nf_protein;
    if (scroll) foodDetailsRef?.scrollIntoView({ behavior: "smooth" });
  }

  foodState.loading = false;
};

const onFocus = (index: number, focus: boolean) => {
  const foodState = foodStates.value[index];
  if (!foodState) return;
  foodState.focused = focus;
};
</script>

<template>
  <div class="flex-col flex justify-center m-4">
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
              @submit.prevent="changeFoodDetails(index)"
            >
              <input
                v-model.lazy="food.foodName"
                class="focus:outline-none focus:placeholder-shown:scale-110 focus:placeholder-shown:translate-x-3 transition-transform container"
                type="text"
                name="foodName"
                aria-label="Enter food"
                placeholder="Enter food"
                @focus="onFocus(index, true)"
                @blur="onFocus(index, false)"
                @change="resetFoodIfEmpty(index)"
              >
            </form>
            <div
              v-if="foodStates[index]?.loading"
              class="absolute right-24 top-2"
            >
              <Icon name="line-md:loading-loop" size="2rem" />
            </div>
            <div
              v-else-if="food.calories > 0"
              class="absolute right-20 top-2 select-none pointer-events-none transition-opacity"
              :class="foodStates[index]?.focused ? 'opacity-0' : 'opacity-65'"
            >
              <div>{{ food.calories }}kcal</div>
            </div>
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
        </div>
      </div>
      <div class="flex justify-center overflow-hidden">
        <FoodListButton
          label="Add food"
          name="addFood"
          icon="ic:outline-plus"
          @click="addItem"
        />
        <FoodListButton
          label="Reset"
          name="resetFood"
          icon="heroicons:arrow-path"
          @click="resetFoods"
        />
      </div>
    </div>
    <div>
      <div class="grid grid-cols-1 text-xl text-center">
        <div class="font-bold">Calories:</div>
        <div>{{ Math.round(totalNutrients.totalCalories) }}kcal</div>
      </div>
    </div>
  </div>
</template>
