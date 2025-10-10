<script setup lang="ts">
const emit = defineEmits<{ close: [boolean] }>();
</script>

<template>
  <UModal
    :ui="{
      content: 'w-fit ring-0 rounded-xl bg-slate-300 dark:bg-slate-800',
    }"
    @close:prevent="emit('close', false)"
  >
    <template #content>
      <FoodDetails />
      <div class="flex justify-center items-center mb-2">
        <ModalButton
          icon="heroicons:x-mark"
          label="Close"
          @click="emit('close', false)"
        />
      </div>
    </template>
  </UModal>
</template>
