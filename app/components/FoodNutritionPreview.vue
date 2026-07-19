<script setup lang="ts">
defineProps<{
  title: string;
  calories: number;
  fat: number;
  protein: number;
  carbohydrate: number;
  sugar: number;
  sodium: number;
}>();
</script>

<template>
  <div class="bg-gaming-950/60 rounded-xl p-3 border border-gaming-800/20 mb-4">
    <div
      class="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold"
    >
      {{ title }}
    </div>
    <div class="grid grid-cols-3 gap-2">
      <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
        <div class="text-sm font-bold text-gaming-300">
          {{ calories }}
        </div>
        <div class="text-[10px] text-white/40">kcal</div>
      </div>
      <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
        <div class="text-sm font-bold text-white">{{ fat }}g</div>
        <div class="text-[10px] text-white/40">Fat</div>
      </div>
      <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
        <div class="text-sm font-bold text-white">{{ protein }}g</div>
        <div class="text-[10px] text-white/40">Protein</div>
      </div>
      <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
        <div class="text-sm font-bold text-white">{{ carbohydrate }}g</div>
        <div class="text-[10px] text-white/40">Carbs</div>
      </div>
      <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
        <div class="text-sm font-bold text-white">{{ sugar }}g</div>
        <div class="text-[10px] text-white/40">Sugar</div>
      </div>
      <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
        <div class="text-sm font-bold text-white">{{ sodium }}mg</div>
        <div class="text-[10px] text-white/40">Sodium</div>
      </div>
    </div>
  </div>
</template>
