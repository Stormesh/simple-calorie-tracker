<script setup lang="ts">
defineProps<{
  index: number;
  foodState?: { loading: boolean; focused: boolean };
  calories: number;
  grams: number;
}>();

const foodName = defineModel<string>("foodName");

const {
  changeFoodDetails,
  openFoodSearch,
  editFood,
  searchAndSelectServing,
  onFocus,
  resetFoodIfEmpty,
  deleteItem,
} = inject(FOOD_LIST_KEY)!;
</script>

<template>
  <div class="py-1.5 mx-2 md:max-w-sm max-w-xs">
    <!-- Loading state -->
    <div
      v-if="foodState?.loading"
      class="h-11 flex items-center justify-center bg-gaming-950/60 rounded-xl overflow-hidden shadow-inner shadow-gaming-950/50 ring-1 ring-gaming-800/30"
    >
      <Icon name="line-md:loading-loop" size="1.4rem" class="text-gaming-400" />
    </div>

    <!-- Empty row: editable input -->
    <div
      v-else-if="calories === 0"
      class="h-11 flex relative bg-gaming-950/60 rounded-xl overflow-hidden shadow-inner shadow-gaming-950/50 input-gaming"
      :class="
        foodState?.focused ? 'ring-2 ring-gaming-500/70 glow-border' : 'ring-1 ring-gaming-800/30'
      "
    >
      <form
        class="flex-1 inline-flex items-center px-3"
        @submit.prevent="searchAndSelectServing(index, true)"
      >
        <Icon name="mdi:food-apple" size="1.2rem" class="text-gaming-500 mr-2 shrink-0" />
        <input
          v-model="foodName"
          class="bg-transparent focus:outline-none text-white placeholder:text-white/30 text-sm w-full font-medium tracking-wide"
          type="text"
          name="foodName"
          aria-label="Enter food"
          placeholder="Search food..."
          :disabled="foodState?.loading"
          @focus="onFocus(index, true)"
          @blur="onFocus(index, false)"
          @change="resetFoodIfEmpty(index)"
        />
      </form>
      <button
        class="px-3 flex items-center justify-center hover:bg-gaming-700/50 active:bg-gaming-600/50 transition-all duration-200 group cursor-pointer border-l border-gaming-800/30 rounded-r-xl"
        name="searchFood"
        aria-label="Search food"
        @click="openFoodSearch(index)"
      >
        <Icon
          name="heroicons:magnifying-glass"
          size="1.2rem"
          class="text-white/40 group-hover:text-gaming-400 transition-all duration-200"
        />
      </button>
    </div>

    <!-- Populated row: clickable food display -->
    <div
      v-else
      class="h-11 flex relative bg-gaming-950/60 rounded-xl overflow-hidden shadow-inner shadow-gaming-950/50 border border-gaming-800/20 hover:border-gaming-600/40 transition-all cursor-pointer group"
      @click="changeFoodDetails(index, true)"
    >
      <div class="flex-1 inline-flex items-center px-3 gap-2 min-w-0">
        <Icon name="mdi:food-apple" size="1.2rem" class="text-gaming-500 shrink-0" />
        <span class="text-sm font-medium text-white truncate">{{ foodName }}</span>
      </div>
      <div class="flex items-center px-3 border-l border-gaming-800/30 gap-2">
        <span class="text-xs font-bold text-gaming-400 font-mono"
          >{{ Math.round(calories) }}<span class="text-gaming-600">kcal</span></span
        >
        <span class="text-[11px] font-mono text-white/40"
          >({{ Math.round(grams) }}<span class="text-white/30">g</span>)</span
        >
      </div>
      <button
        class="px-2.5 flex items-center justify-center hover:bg-gaming-700/50 transition-all duration-200 border-l border-gaming-800/30"
        name="editFood"
        aria-label="Edit food"
        @click.stop="editFood(index)"
      >
        <Icon
          name="ic:outline-edit"
          size="1.3rem"
          class="text-white/40 group-hover:text-gaming-400 transition-all duration-200"
        />
      </button>
      <button
        class="px-2.5 flex items-center justify-center hover:bg-hp-red/30 transition-all duration-200 border-l border-gaming-800/30 rounded-r-xl"
        name="deleteFood"
        aria-label="Delete food"
        @click.stop="deleteItem(index)"
      >
        <Icon
          name="ic:outline-delete"
          size="1.3rem"
          class="text-white/40 group-hover:text-hp-red group-hover:scale-110 transition-all duration-200"
        />
      </button>
    </div>
  </div>
</template>
