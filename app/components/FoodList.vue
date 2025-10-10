<script setup lang="ts">
interface IFoodProps {
  title: string;
  foodDetailsRef: Element | null;
}

const MAX_FOODS = 10;

const { title, foodDetailsRef } = defineProps<IFoodProps>();

const { foodDetails } = useFoodDetails();

const foods = useCookie<IFoodTemplate[]>(`foods-${title}`, {
  default: () => {
    return foodArrayDefault();
  },
});

const isPopoverOpen = ref(false);

const foodText = ref("");

const foodStates = ref<IFoodState[]>(
  Array.from({ length: foods.value.length }, foodStateDefault)
);

const maxFoodsReached = computed(() => {
  return foods.value.length >= MAX_FOODS;
});

const { showToast, showFoodError } = useCustomToast();

const totalNutrients = computed(() => {
  return foods.value.reduce(
    (totals, food) => {
      return {
        totalCalories: totals.totalCalories + food.calories,
        totalFat: totals.totalFat + food.totalFat,
        sodium: totals.sodium + food.sodium,
        totalCarbohydrate: totals.totalCarbohydrate + food.totalCarbohydrate,
        sugars: totals.sugars + food.sugars,
        protein: totals.protein + food.protein,
      };
    },
    {
      totalCalories: 0,
      totalFat: 0,
      sodium: 0,
      totalCarbohydrate: 0,
      sugars: 0,
      protein: 0,
    }
  );
});

const cardMode = useCardMode();

watch(
  () => foods.value.length,
  (newLength) => {
    foodStates.value = Array.from({ length: newLength }, foodStateDefault);
  }
);

const addFood = async (foodName?: string) => {
  if (maxFoodsReached.value) {
    return showToast(
      "Max Foods Reached",
      `You can only add up to ${MAX_FOODS} foods for ${title}`,
      "ic:outline-error"
    );
  }

  if (cardMode.value && !foodName?.trim()) {
    return showFoodError();
  }

  foods.value.push(foodTemplateDefault());

  if (foodName?.trim()) {
    isPopoverOpen.value = false;

    await nextTick();
    await changeFoodDetails(foods.value.length - 1, false, foodName);

    if (foods.value[foods.value.length - 1]!.foodName !== foodName) {
      deleteItem(foods.value.length - 1);
      return showFoodError();
    }

    foodText.value = "";
  }
};

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

const resetFoods = () => {
  foods.value = foodArrayDefault();
};

const deleteItem = (index: number) => {
  if (foods.value.length <= 1) {
    resetFood(0);
    return;
  }

  foods.value.splice(index, 1);
};

const changeFoodDetails = async (
  index: number,
  scroll: boolean = false,
  name?: string
) => {
  const foodItem = foods.value[index],
    foodState = foodStates.value[index];
  if (!foodItem || !foodState) return;

  foodState.focused = false;
  foodState.loading = true;

  const foodName = name || foodItem?.foodName || "";
  const details = await searchFood(foodName);
  if (details) {
    foodDetails.value = details;
    foods.value[index] = {
      ...foodItem,
      foodName: name || foodName,
      calories: details.nf_calories,
      totalFat: details.nf_total_fat,
      sodium: details.nf_sodium,
      totalCarbohydrate: details.nf_total_carbohydrate,
      sugars: details.nf_sugars,
      protein: details.nf_protein,
      photo: details.photo.thumb,
    };
    if (scroll) foodDetailsRef?.scrollIntoView({ behavior: "smooth" });
  } else {
    showFoodError();
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
  <div class="flex flex-col justify-center m-4">
    <h1
      class="text-2xl bg-slate-500 dark:bg-sky-700 rounded-t-xl text-white text-center font-black"
    >
      {{ title }}
    </h1>
    <div class="bg-slate-300 dark:bg-slate-800 rounded-b-xl shadow-md">
      <div
        :class="
          cardMode && 'flex justify-center items-center flex-wrap w-xs md:w-lg'
        "
      >
        <div v-for="(food, index) in foods" :key="index">
          <FoodInput
            v-if="!cardMode"
            v-model:food-name="food.foodName"
            :index="index"
            :calories="food.calories"
            :food-state="foodStates[index]"
            :change-food-details="changeFoodDetails"
            :on-focus="onFocus"
            :reset-food-if-empty="resetFoodIfEmpty"
            :delete-item="deleteItem"
          />
          <FoodCard
            v-else
            :food-name="food.foodName"
            :index="index"
            :calories="food.calories"
            :food-state="foodStates[index]"
            :src="food.photo"
            :change-food-details="changeFoodDetails"
            :delete-item="deleteItem"
          />
        </div>
        <div class="flex justify-center overflow-hidden">
          <PopoverTemplate
            v-if="cardMode"
            v-model:open="isPopoverOpen"
            title="Add food"
          >
            <template #trigger>
              <FoodListButton
                label="Add food"
                name="addFood"
                icon="ic:outline-plus"
              />
            </template>
            <template #content>
              <FoodCardInput
                v-model:food-text="foodText"
                :food-callback="() => addFood(foodText)"
              />
            </template>
          </PopoverTemplate>
          <FoodListButton
            v-else
            label="Add food"
            name="addFood"
            icon="ic:outline-plus"
            @click="addFood"
          />
          <FoodListButton
            label="Reset"
            name="resetFood"
            icon="heroicons:arrow-path"
            @click="resetFoods"
          />
        </div>
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
