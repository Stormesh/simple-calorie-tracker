<template>
  <header
    class="flex justify-between items-center px-5 md:px-10 bg-slate-50 dark:bg-slate-900 shadow-md dark:border-b-2 dark:border-sky-700 h-16"
  >
    <!-- Light mode -->
    <NuxtImg src="maxhp_side.png" alt="Logo" class="dark:hidden h-10 md:h-16" />

    <!-- Dark mode -->
    <NuxtImg
      src="maxhp_side_dark.png"
      alt="Logo"
      class="hidden dark:block h-10 md:h-16"
    />
    <NutritionixLogo />
  </header>
</template>
