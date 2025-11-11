<script setup lang="ts">
interface IFoodProps {
  title: string;
  foodDetailsRef: Element | null;
}

interface IFoodState {
  loading: boolean;
  focused: boolean;
}

const MAX_FOODS = 10;

const { title, foodDetailsRef } = defineProps<IFoodProps>();

const foods = useCookie<IFoodTemplate[]>(`foods-${title}`, {
  default: () => {
    return foodArrayDefault();
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
        cholesterol: totals.cholesterol + food.cholesterol,
        sodium: totals.sodium + food.sodium,
        totalCarbohydrate: totals.totalCarbohydrate + food.totalCarbohydrate,
        sugars: totals.sugars + food.sugars,
        protein: totals.protein + food.protein,
      };
    },
    {
      totalCalories: 0,
      totalFat: 0,
      cholesterol: 0,
      sodium: 0,
      totalCarbohydrate: 0,
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
  foods.value = foodArrayDefault();
};

const changeFoodDetails = async (index: number, scroll: boolean = false) => {
  const foodItem = foods.value[index],
    foodState = foodStates.value[index];
  if (!foodItem || !foodState) return;

  foodState.focused = false;
  foodState.loading = true;

  const foodName = foodItem.foodName || "";
  const details = await searchFood(foodName);
  if (details) {
    foodDetails.value = details;
    const serving = details.servings.serving[0];

    if (serving) {
      foodItem.calories = serving.calories || 0;
      foodItem.totalFat = serving.fat || 0;
      foodItem.sodium = serving.sodium || 0;
      foodItem.totalCarbohydrate = serving.carbohydrate || 0;
      foodItem.sugars = serving.sugar || 0;
      foodItem.protein = serving.protein || 0;
      foodItem.cholesterol = serving.cholesterol || 0;
    }
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
        <FoodInput
          v-model:food-name="food.foodName"
          :index="index"
          :calories="food.calories"
          :food-state="foodStates[index]"
          :change-food-details="changeFoodDetails"
          :on-focus="onFocus"
          :reset-food-if-empty="resetFoodIfEmpty"
          :delete-item="deleteItem"
        />
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
