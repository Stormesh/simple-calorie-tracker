<script setup lang="ts">
const customFood = ref<ICustomFood>({
  foodName: "",
  calories: 0,
});

const { addCustomFood } = useCustomFood();
const handleSubmit = () => {
  addCustomFood(customFood.value);
};
</script>

<template>
  <UForm
    class="py-2 px-4 flex justify-center items-center flex-wrap flex-col"
    @submit.prevent="handleSubmit"
  >
    <UFormField
      label="Food Name"
      :ui="{
        label: 'text-base',
      }"
    >
      <UInput
        v-model="customFood.foodName"
        placeholder="Food Name"
        :ui="{
          base: 'text-base',
        }"
      />
    </UFormField>
    <UFormField
      label="Calories"
      :ui="{
        label: 'text-base',
      }"
    >
      <UInput
        v-model="customFood.calories"
        placeholder="Calories"
        type="number"
        :ui="{
          base: 'text-base',
        }"
      />
    </UFormField>
    <div class="flex items-center justify-center mt-3">
      <ModalButton
        icon="heroicons:check"
        label="Save"
        class="hover:bg-teal-600 active:bg-teal-500"
        @click="handleSubmit"
      />
    </div>
  </UForm>
</template>

