<script setup lang="ts">
interface FoodProps {
  title: string;
  foodDetailsRef: Element | null;
}

interface IFoodTemplate {
  foodName: string;
  calories: number;
  isFoodLoading: boolean;
}

const foodTemplate = () => ({
  foodName: "",
  calories: 0,
  isFoodLoading: false,
});

const foodLength = 6;

const { title, foodDetailsRef } = defineProps<FoodProps>();

const foods = ref<IFoodTemplate[]>(Array.from({ length: foodLength }, foodTemplate));

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
  foods.value.push(foodTemplate());
};

const changeFoodDetails = async (index: number, scroll: boolean = false) => {
  const foodItem = foods.value[index];
  if (!foodItem) return;

  foodItem.isFoodLoading = true;

  if (scroll) foodDetailsRef?.scrollIntoView({ behavior: "smooth" });

  const foodName = foodItem.foodName || "";
  const details = await searchFood(foodName);
  if (details) {
    foodDetails.value = details;
    foodItem.calories = details.nf_calories;
  }

  foodItem.isFoodLoading = false;
};
</script>

<template>
  <div class="m-4 flex-col flex justify-center">
    <h1
      class="text-2xl bg-slate-500 rounded-t-xl text-white text-center font-black"
    >
      {{ title }}
    </h1>
    <ul class="bg-slate-300 rounded-b-xl">
      <li v-for="(food, index) in foods" :key="index">
        <div class="py-1.5 mx-2">
          <div class="h-10 flex relative rounded-lg overflow-hidden shadow">
            <form
              class="container inline-block bg-stone-50 p-2"
              @submit.prevent
              @submit="changeFoodDetails(index)"
            >
              <input
                v-model="food.foodName"
                class="focus:outline-none focus:placeholder-shown:scale-110 focus:placeholder-shown:translate-x-3 transition-transform container"
                type="text"
                placeholder="Enter food"
              >
            </form>
            <button
              class="min-h-fit inline-block bg-slate-600 hover:bg-slate-500 group cursor-pointer"
              @click="changeFoodDetails(index, true)"
            >
              <icon
                name="ic:outline-keyboard-double-arrow-down"
                size="2.5rem"
                class="text-white group-hover:translate-y-1 transition-transform duration-150"
              />
            </button>
            <button
              class="min-h-fit inline-block bg-slate-600 hover:bg-slate-500 group cursor-pointer"
              @click="deleteItem(index)"
            >
              <icon
                name="ic:outline-delete"
                size="2.5rem"
                class="text-white group-hover:scale-110 group-hover:text-red-600 transition-all duration-150"
              />
            </button>
          </div>
          <div v-if="food.isFoodLoading" class="flex justify-center items-center">
            <icon
              name="line-md:loading-loop"
              size="2rem"
            />
          </div>
          <div v-else-if="food.calories > 0" class="grid grid-cols-2">
            <div class="font-bold text-center">Calories:</div>
            <div>{{ food.calories }}kcal</div>
          </div>
        </div>
      </li>
      <div class="flex justify-center overflow-hidden">
        <button
          class="px-4 py-1 bg-slate-600 hover:bg-slate-500 font-bold translate-y-2 hover:translate-y-0 transition-transform text-white rounded-t-xl cursor-pointer"
          @click="addItem"
        >
          Add food
          <icon
            name="ic:outline-add"
            size="2rem"
            class="inline-block align-middle"
          />
        </button>
      </div>
    </ul>
    <div>
      <div class="grid grid-cols-1 text-xl text-center">
        <div class="font-bold">Calories:</div>
        <div>{{ Math.round(totalCalories) }}kcal</div>
      </div>
    </div>
  </div>
</template>
