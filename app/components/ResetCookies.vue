<script setup lang="ts">
interface ResetProps {
  cookieNames: string[];
}

const open = ref(false);

const { cookieNames } = defineProps<ResetProps>();

const resetCookies = () => {
  cookieNames.forEach((cookieName) => {
    useCookie(cookieName).value = null;
  });
  window.location.reload();
};
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      icon="heroicons:arrow-path"
      label="Reset"
      class="cursor-pointer text-lg m-2 bg-rose-800 hover:bg-rose-700 active:bg-rose-600 text-white font-bold py-2 px-4 rounded-lg"
    />
    <template #content>
      <div>
        <h1 class="text-2xl text-center text-white font-extrabold bg-slate-500 dark:bg-sky-700">
          Reset
        </h1>
        <div
          class="pb-2 px-4 bg-slate-300 dark:bg-slate-800 flex justify-center items-center flex-col flex-wrap"
        >
          <p class="text-lg m-1">Are you sure you want to reset all foods?</p>
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
              @click="open = false"
            />
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
