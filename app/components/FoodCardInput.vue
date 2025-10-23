<script setup lang="ts">
interface ICustomFoodInputProps {
  foodCallback: () => void | Promise<void>;
  closeModal: () => void;
}

const { closeModal } = defineProps<ICustomFoodInputProps>();

const foodText = defineModel<string>("foodText");

const { showCustomFoodModal } = useCustomFood();

const showCustomFoodPanel = () => {
  closeModal();
  showCustomFoodModal();
}
</script>

<template>
  <UForm
    class="py-2 px-4 flex justify-center items-center flex-wrap flex-col"
    @submit.prevent="foodCallback"
  >
    <UInput
      v-model="foodText"
      placeholder="Food name"
      :ui="{
        base: 'text-base',
      }"
    />
    <div class="flex items-center justify-center mt-3">
      <ModalButton
        icon="ic:baseline-dinner-dining"
        label="Add Custom Food"
        class="hover:bg-teal-600 active:bg-teal-500"
        @click="showCustomFoodPanel"
      />
      <ModalButton
        icon="heroicons:check"
        label="Save"
        class="hover:bg-teal-600 active:bg-teal-500"
        @click="foodCallback"
      />
    </div>
  </UForm>
</template>
