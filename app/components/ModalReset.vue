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
      <UButton
        icon="heroicons:check"
        label="Yes"
        class="text-lg cursor-pointer bg-slate-600 dark:bg-sky-700 hover:bg-rose-700 active:bg-rose-600 text-white font-bold py-2 px-4 mx-2 rounded-lg"
        @click="resetCookies"
      />
      <UButton
        icon="heroicons:x-mark"
        label="No"
        class="text-lg cursor-pointer bg-slate-600 dark:bg-sky-700 hover:bg-teal-600 active:bg-teal-500 text-white font-bold py-2 px-4 mx-2 rounded-lg"
        @click="emit('close', false)"
      />
    </div>
  </ModalTemplate>
</template>
