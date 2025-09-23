<script setup lang="ts">
interface INutrition {
  label: string;
  value: number;
  unit: string;
  max?: number;
}

interface INutritionCardProps {
  nutrition: INutrition;
}

defineProps<INutritionCardProps>();
</script>

<template>
  <h2 :key="nutrition.label">
    <span
      :class="
        nutrition.max && Math.round(nutrition.value) > nutrition.max
          ? 'dark:text-red-500 text-red-700'
          : 'dark:text-green-500 text-green-700'
      "
      >{{ Math.round(nutrition.value) + nutrition.unit }}</span
    >
    <span v-if="nutrition.max"> / {{ nutrition.max + nutrition.unit }} </span>
    <span
      class="font-light block"
      :class="nutrition.label === 'Calories' ? 'text-xl' : 'text-base'"
      >{{ nutrition.label }}</span
    >
  </h2>
</template>
