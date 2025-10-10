<script setup lang="ts">
import { FoodModal } from "#components";

interface IFoodCardProps {
  calories: number;
  foodName: string;
  src?: string;
  foodState?: IFoodState;
  changeFoodDetails: (
    index: number,
    scroll?: boolean,
    name?: string
  ) => Promise<void>;
  deleteItem: (index: number) => void;
  index: number;
}

const {
  foodName,
  changeFoodDetails,
  foodState = foodStateDefault(),
  src = "",
} = defineProps<IFoodCardProps>();

const overlay = useOverlay();

const foodModal = overlay.create(FoodModal);
const { foodDetails } = useFoodDetails();
const foodText = ref("");

const isPopoverOpen = ref(false);

const { showFoodError } = useCustomToast();

watch(isPopoverOpen, (newVal) => {
  if (newVal) {
    foodText.value = foodName;
  }
});

const editFood = async (index: number) => {
  if (!foodText.value.trim()) {
    return showFoodError();
  }

  isPopoverOpen.value = false;

  await changeFoodDetails(index, false, foodText.value);
};

const viewFood = async (index: number) => {
  if (!foodDetails.value || foodDetails.value.food_name !== foodName) {
    await changeFoodDetails(index, true);
  }

  foodModal.open();
};
</script>

<template>
  <div
    class="bg-slate-200 shadow-sm dark:bg-slate-900 dark:border-2 border-slate-500 dark:border-slate-700 flex justify-center items-center w-56 h-56 rounded-lg m-2"
  >
    <div
      v-if="foodState?.loading"
      class="flex justify-center items-center w-full h-full"
    >
      <icon name="line-md:loading-loop" size="5rem" />
    </div>
    <div v-else class="flex flex-col flex-wrap justify-center items-center">
      <div
        v-if="foodName"
        class="flex flex-col flex-wrap justify-center items-center"
      >
        <NuxtImg
          :src
          :alt="foodName?.toLowerCase().replace(' ', '_')"
          class="w-28 h-28 rounded-2xl object-contain"
        />
        <div class="text-xl font-bold">
          {{ foodName.charAt(0).toUpperCase() + foodName.slice(1) }}
        </div>
        <div class="text-lg font-semibold opacity-50">
          {{ Math.round(calories) }}kcal
        </div>
      </div>
      <div>
        <PopoverTemplate
          v-model:open="isPopoverOpen"
          :title="foodName ? 'Edit food' : 'Add food'"
        >
          <template #trigger>
            <SmallButton
              v-if="foodName"
              class="hover:bg-teal-600 active:bg-teal-500"
              name="editFood"
              aria-label="Edit food"
            >
              <Icon
                name="ic:round-edit"
                size="2.5rem"
                class="text-black group-hover:text-white dark:text-white group-hover:-rotate-90 transition-transform duration-150"
              />
            </SmallButton>
            <button
              v-else
              class="group cursor-pointer text-4xl font-extrabold opacity-50 flex flex-col items-center justify-center select-none"
            >
              Add
              <Icon
                name="ic:round-add"
                class="group-hover:scale-125 transition-transform"
                size="6rem"
              />
              food
            </button>
          </template>
          <template #content>
            <FoodCardInput
              v-model:food-text="foodText"
              :food-callback="() => editFood(index)"
            />
          </template>
        </PopoverTemplate>
        <div v-if="foodName" class="inline-block">
          <SmallButton
            class="hover:bg-sky-600 active:bg-sky-500"
            name="viewFood"
            aria-label="View food"
            @click="viewFood(index)"
          >
            <Icon
              name="ic:round-info"
              size="2.5rem"
              class="text-black group-hover:text-white dark:text-white group-hover:scale-110 transition-all duration-150"
            />
          </SmallButton>
          <SmallButton
            class="hover:bg-rose-800 active:bg-rose-700"
            name="deleteFood"
            aria-label="Delete food"
            @click="deleteItem(index)"
          >
            <Icon
              name="ic:outline-delete"
              size="2.5rem"
              class="text-black group-hover:text-white dark:text-white group-hover:scale-110 transition-all duration-150"
            />
          </SmallButton>
        </div>
      </div>
    </div>
  </div>
</template>
