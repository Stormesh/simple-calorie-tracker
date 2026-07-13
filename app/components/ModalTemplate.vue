<script setup lang="ts">
interface IModalProps {
  title: string;
}

const emit = defineEmits<{ close: [boolean] }>();

const { title } = defineProps<IModalProps>();
</script>

<template>
  <UModal
    @close="
      {
        emit('close', false);
      }
    "
    :ui="{
      content:
        'modal-gaming rounded-2xl shadow-2xl shadow-gaming-900/60 border-0',
    }"
  >
    <template #content>
      <div class="rounded-2xl">
        <div
          class="section-header text-xl font-black text-gaming-300 text-center py-3 px-6 bg-gaming-900/80 border-b border-gaming-700/30 tracking-widest"
        >
          <span class="shimmer-text">{{ title }}</span>
        </div>
        <div class="overflow-y-auto max-h-[70vh] px-6 pb-4 pt-4">
          <slot />
        </div>
      </div>
    </template>
  </UModal>
</template>
