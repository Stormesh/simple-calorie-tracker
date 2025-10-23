<script setup lang="ts">
const { removeCustomFood, customFoods } = useCustomFood();

const activeFoodIndex = ref<number | null>(null);

const setActiveFood = (index: number) => {
  activeFoodIndex.value = index;
};

const handleRemoveCustomFood = (index: number) => {
  if (index === activeFoodIndex.value) {
    activeFoodIndex.value = null;
  } else if (activeFoodIndex.value && index < activeFoodIndex.value) {
    activeFoodIndex.value -= 1;
  }

  removeCustomFood(index);
};
</script>

<template>
  <ul class="bg-slate-900 border border-slate-600 w-72 h-52 rounded-xl p-2 m-2">
    <li
      v-for="(food, index) in customFoods"
      :key="index"
      class="flex justify-between items-center p-2 rounded-lg cursor-pointer select-none"
      :class="index === activeFoodIndex && 'bg-slate-700'"
      @click="setActiveFood(index)"
    >
      <p>{{ food.foodName }}</p>
      <div class="text-sm text-slate-500">{{ food.calories }}kcal</div>
      <div class="flex justify-center items-center">
        <SmallButton
          class="hover:bg-rose-800 active:bg-rose-700"
          name="removeCustomFood"
          aria-label="Remove food"
          @click.stop="handleRemoveCustomFood(index)"
        >
          <Icon
            name="heroicons:trash"
            size="2.5rem"
            class="text-black group-hover:text-white dark:text-white group-hover:scale-110 transition-all duration-150"
          />
        </SmallButton>
      </div>
    </li>
  </ul>
</template>
