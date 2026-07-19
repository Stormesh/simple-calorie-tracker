<template>
  <main class="bg-gaming-gradient min-h-screen text-white">
    <div
      class="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.06),transparent_70%)]"
    />
    <div class="relative z-10">
      <MyHeader />
      <slot />
    </div>
  </main>
</template>
