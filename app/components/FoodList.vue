<script setup lang="ts">
import { FoodSearchModal } from "#components";

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
  Array.from({ length: foods.value.length }, foodStateDefault),
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
  },
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
    },
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
      "ic:outline-error",
    );
  }
  foods.value.push(foodTemplateDefault());
};

const resetFoods = () => {
  foods.value = foodArrayDefault();
};

const overlay = useOverlay();

const openFoodSearch = (index: number) => {
  const searchModal = overlay.create(FoodSearchModal);
  searchModal.open({
    cookieName: `foods-${title}`,
    index,
  });
};

const scrollToDetails = () => {
  foodDetailsRef?.scrollIntoView({ behavior: "smooth", block: "center" });
};

const showFoodDetails = async (index: number) => {
  const foodItem = foods.value[index],
    foodState = foodStates.value[index];
  if (!foodItem || !foodState) return;

  const foodId = foodItem.foodId || "";
  if (!foodId.trim()) return;

  foodState.loading = true;

  const details = await getFood(foodId);
  if (details) {
    foodDetails.value = details;
    selectedServingId.value = foodItem.servingId || null;
    scrollToDetails();
  }

  foodState.loading = false;
};

const editFood = async (index: number) => {
  const foodItem = foods.value[index],
    foodState = foodStates.value[index];
  if (!foodItem || !foodState) return;

  const foodId = foodItem.foodId || "";
  if (!foodId.trim()) return;

  foodState.loading = true;

  const details = await getFood(foodId);
  if (details) {
    const searchModal = overlay.create(FoodSearchModal);
    searchModal.open({
      cookieName: `foods-${title}`,
      index,
      initialFoodDetails: details,
      editMode: true,
    });
  }

  foodState.loading = false;
};

const searchAndSelectServing = async (
  index: number,
  scroll: boolean = false,
) => {
  const foodItem = foods.value[index],
    foodState = foodStates.value[index];
  if (!foodItem || !foodState) return;

  const foodName = foodItem.foodName || "";
  if (!foodName.trim()) return;

  foodState.focused = false;
  foodState.loading = true;

  const food = await searchFood(foodName);
  if (!food?.food?.[0]) {
    foodState.loading = false;
    return;
  }

  const details = await getFood(food.food[0].food_id);
  foodState.loading = false;

  if (details) {
    const searchModal = overlay.create(FoodSearchModal);
    searchModal.open({
      cookieName: `foods-${title}`,
      index,
      initialFoodDetails: details,
    });
    if (scroll) scrollToDetails();
  }
};

const onFocus = (index: number, focus: boolean) => {
  const foodState = foodStates.value[index];
  if (!foodState) return;
  foodState.focused = focus;
};
</script>

<template>
  <div class="flex-col flex justify-center m-4 animate-fade-in-up">
    <div
      class="section-header text-lg md:text-xl font-black text-gaming-300 text-center py-2 px-6 rounded-t-xl bg-gaming-900/60 border-t border-x border-gaming-700/30 tracking-widest"
    >
      <span class="shimmer-text">{{ title }}</span>
    </div>
    <div
      class="glass-light rounded-b-xl rounded-t-none shadow-lg shadow-gaming-900/30"
    >
      <div class="divide-y divide-gaming-800/30">
        <div
          v-for="(food, index) in foods"
          :key="index"
          class="animate-slide-in"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <FoodInput
            v-model:food-name="food.foodName"
            :index="index"
            :calories="food.calories"
            :grams="food.grams ?? 0"
            :food-state="foodStates[index]"
            :change-food-details="showFoodDetails"
            :open-food-search="openFoodSearch"
            :edit-food="editFood"
            :search-and-select-serving="searchAndSelectServing"
            :on-focus="onFocus"
            :reset-food-if-empty="resetFoodIfEmpty"
            :delete-item="deleteItem"
          />
        </div>
      </div>
      <div class="flex justify-center overflow-hidden pt-1 pb-3 gap-2">
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
    <div class="mt-2">
      <div class="flex items-center justify-center gap-2 text-base">
        <span
          class="text-gaming-400 font-mono text-xs uppercase tracking-widest"
          >Total</span
        >
        <span class="text-white font-black text-lg"
          >{{ Math.round(totalNutrients.totalCalories)
          }}<span class="text-gaming-400 text-sm font-normal"> kcal</span></span
        >
      </div>
    </div>
  </div>
</template>
