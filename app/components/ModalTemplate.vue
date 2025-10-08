<script setup lang="ts">
interface IModalProps {
  title: string;
}

const emit = defineEmits<{ close: [boolean] }>();

const { title } = defineProps<IModalProps>();
</script>

<template>
  <UModal
    :ui="{
      content: 'bg-slate-300 dark:bg-slate-800 rounded-lg shadow-md ring-0',
    }"
    @close="
      {
        emit('close', false);
      }
    "
  >
    <template #content>
      <div>
        <h1
          class="text-2xl text-center text-white font-extrabold bg-slate-500 dark:bg-sky-700"
        >
          {{ title }}
        </h1>
        <div
          class="pb-2 px-4 bg-slate-300 dark:bg-slate-800 flex justify-center items-center flex-col flex-wrap"
        >
          <slot />
        </div>
      </div>
    </template>
  </UModal>
</template>
