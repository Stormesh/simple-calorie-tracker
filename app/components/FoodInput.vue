<script setup lang="ts">
interface IFoodInputProps {
  index: number;
  foodState?: IFoodState;
  calories: number;
  changeFoodDetails: (index: number, scroll?: boolean) => Promise<void>;
  onFocus: (index: number, focus: boolean) => void;
  resetFoodIfEmpty: (index: number) => void;
  deleteItem: (index: number) => void;
}

defineProps<IFoodInputProps>();

const foodName = defineModel<string>("foodName");
</script>

<template>
  <div class="py-1.5 mx-2">
    <div
      class="h-10 flex relative bg-stone-50 dark:bg-slate-900 rounded-lg overflow-hidden shadow"
      :class="foodState?.focused && 'ring-2 ring-slate-500 dark:ring-sky-700'"
    >
      <form
        class="container inline-block p-2"
        @submit.prevent="changeFoodDetails(index)"
      >
        <input
          v-model="foodName"
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
      <div v-if="foodState?.loading" class="absolute right-24 top-2">
        <Icon name="line-md:loading-loop" size="2rem" />
      </div>
      <div
        v-else-if="calories > 0"
        class="absolute right-20 top-2 select-none pointer-events-none transition-opacity"
        :class="foodState?.focused ? 'opacity-0' : 'opacity-65'"
      >
        <div>{{ Math.round(calories) }}kcal</div>
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
</template>
