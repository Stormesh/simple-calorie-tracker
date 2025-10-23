<script setup lang="ts">
import { useStorage } from "@vueuse/core";

interface IResetProps {
  cookieNames: string[];
}

const emit = defineEmits<{ close: [boolean] }>();

const foodsReset = ref(false);

const { cookieNames: foodNames } = defineProps<IResetProps>();

const resetGlobalFoods = () => {
  if (foodsReset.value) return;

  foodNames.forEach((foodName) => {
    const food = useStorage<IFoodTemplate[]>(foodName, () => []);
    food.value = foodArrayDefault();
  });
  foodsReset.value = true;
  window.location.reload();
};
</script>

<template>
  <ModalTemplate title="Reset">
    <template #content>
      <p class="text-xl m-1 text-center">
        Are you sure you want to reset all foods?
      </p>
      <div>
        <ModalButton
          icon="heroicons:check"
          label="Yes"
          class="hover:bg-rose-700 active:bg-rose-600"
          @click="resetGlobalFoods"
        />
        <ModalButton
          icon="heroicons:x-mark"
          label="No"
          class="hover:bg-teal-600 active:bg-teal-500"
          @click="emit('close', false)"
        />
      </div>
    </template>
  </ModalTemplate>
</template>
