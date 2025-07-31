<template>
  <Head>
    <Title>MaxHP - Level up your health</Title>
    <Meta name="description" content="MaxHP - Level up your health" />
  </Head>
  <div class="bg-slate-100 min-h-screen">
    <NuxtRouteAnnouncer />
    <MyHeader />
    <div class="flex justify-center flex-wrap">
      <FoodList title="Breakfast" />
      <FoodList title="Lunch" />
      <FoodList title="Dinner" />
      <FoodList title="Snacks" />
    </div>
    <FoodDetails />
  </div>
</template>
