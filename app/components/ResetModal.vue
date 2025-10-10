<script setup lang="ts">
interface IResetProps {
  cookieNames: string[];
}

const emit = defineEmits<{ close: [boolean] }>();

const cookiesReset = ref(false);

const { cookieNames } = defineProps<IResetProps>();

const resetCookies = () => {
  if (cookiesReset.value) return;

  cookieNames.forEach((cookieName) => {
    useCookie(cookieName).value = null;
  });
  cookiesReset.value = true;
  window.location.reload();
};
</script>

<template>
  <ModalTemplate title="Reset">
    <p class="text-xl m-1 text-center">
      Are you sure you want to reset all foods?
    </p>
    <div>
      <ModalButton
        icon="heroicons:check"
        label="Yes"
        class="hover:bg-rose-700 active:bg-rose-600"
        @click="resetCookies"
      />
      <ModalButton
        icon="heroicons:x-mark"
        label="No"
        class="hover:bg-teal-600 active:bg-teal-500"
        @click="emit('close', false)"
      />
    </div>
  </ModalTemplate>
</template>
