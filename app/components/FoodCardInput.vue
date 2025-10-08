<script setup lang="ts">
defineProps<{
  foodCallback: () => void | Promise<void>;
}>();

const foodText = defineModel<string>("foodText");
</script>

<template>
  <div>
    <UForm
      class="py-2 px-4 flex justify-center items-center flex-wrap"
      @submit.prevent="foodCallback"
    >
      <UInput
        v-model="foodText"
        placeholder="Food name"
        :ui="{
          base: 'text-base',
        }"
      />
      <UButton
        label="Save"
        class="text-lg cursor-pointer bg-slate-600 dark:bg-sky-700 hover:bg-teal-600 active:bg-teal-500 text-white font-bold py-1 px-3 ml-2 rounded-lg"
        @click="foodCallback"
      />
    </UForm>
  </div>
</template>
