<script setup lang="ts">
interface ISearchResult {
  food_id: string;
  food_name: string;
  food_description: string;
  food_type: string;
}

interface IModalProps {
  cookieName: string;
  index: number;
  initialFoodDetails?: IFoodDetails;
}

const props = defineProps<IModalProps>();
const emit = defineEmits<{ close: [value: boolean] }>();

const foods = useCookie<IFoodTemplate[]>(props.cookieName, {
  default: () => foodArrayDefault(),
});

const searchQuery = ref("");
const results = ref<ISearchResult[]>([]);
const isSearching = ref(false);
const hasSearched = ref(false);

const selectedFoodDetails = ref<IFoodDetails | null>(props.initialFoodDetails || null);
const isFetchingDetails = ref(false);

const selectedServingIndex = ref(0);
const quantity = ref(1);

const servings = computed(() => selectedFoodDetails.value?.servings?.serving || []);

const selectedServing = computed(() => servings.value[selectedServingIndex.value] || null);

const scaledNutrition = computed(() => {
  const s = selectedServing.value;
  if (!s) return null;
  const q = quantity.value || 0;
  return {
    calories: Math.round((s.calories || 0) * q),
    fat: Math.round(((s.fat || 0) * q) * 10) / 10,
    protein: Math.round(((s.protein || 0) * q) * 10) / 10,
    carbohydrate: Math.round(((s.carbohydrate || 0) * q) * 10) / 10,
    sugar: Math.round(((s.sugar || 0) * q) * 10) / 10,
    sodium: Math.round(((s.sodium || 0) * q) * 10) / 10,
    cholesterol: Math.round(((s.cholesterol || 0) * q) * 10) / 10,
  };
});

let debounceTimer: ReturnType<typeof setTimeout>;

const doSearch = async () => {
  const q = searchQuery.value.trim();
  if (!q) return;

  isSearching.value = true;
  hasSearched.value = true;
  selectedFoodDetails.value = null;

  try {
    const data = await searchFood(q);
    results.value = (data?.food || []) as ISearchResult[];
  } catch {
    results.value = [];
  }

  isSearching.value = false;
};

const onSearchInput = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(doSearch, 400);
};

const selectResult = async (foodId: string) => {
  isFetchingDetails.value = true;
  selectedServingIndex.value = 0;
  quantity.value = 1;

  try {
    const details = await getFood(foodId);
    selectedFoodDetails.value = details;
  } catch {
    selectedFoodDetails.value = null;
  }

  isFetchingDetails.value = false;
};

const backToResults = () => {
  selectedFoodDetails.value = null;
};

const submitFood = () => {
  const s = scaledNutrition.value;
  const food = selectedFoodDetails.value;
  if (!s || !food) return;

  const foodItem = foods.value[props.index];
  if (foodItem) {
    foodItem.foodName = food.food_name;
    foodItem.foodId = food.food_id;
    foodItem.servingId = selectedServing.value?.serving_id || "";
    foodItem.calories = s.calories;
    foodItem.totalFat = s.fat;
    foodItem.cholesterol = s.cholesterol;
    foodItem.sodium = s.sodium;
    foodItem.totalCarbohydrate = s.carbohydrate;
    foodItem.sugars = s.sugar;
    foodItem.protein = s.protein;
  }

  emit("close", true);
};

const close = () => {
  emit("close", false);
};
</script>

<template>
  <UModal @close="close" :ui="{ content: 'modal-gaming rounded-2xl shadow-2xl shadow-gaming-900/60 border-0 max-w-lg' }">
    <template #content>
      <div class="overflow-hidden rounded-2xl flex flex-col max-h-[85vh]">
        <div class="section-header text-base font-black text-gaming-300 text-center py-3 px-6 bg-gaming-900/80 border-b border-gaming-700/30 tracking-widest shrink-0">
          <span v-if="!selectedFoodDetails" class="shimmer-text">Search Food</span>
          <span v-else class="flex items-center gap-2 justify-center">
            <button class="text-gaming-400 hover:text-white transition-colors" @click="backToResults">
              <Icon name="heroicons:arrow-left" size="1.2rem" />
            </button>
            <span class="shimmer-text text-sm truncate">{{ selectedFoodDetails.food_name }}</span>
          </span>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div v-if="!selectedFoodDetails" class="p-4">
            <div class="relative">
              <Icon name="heroicons:magnifying-glass" size="1.2rem" class="absolute left-3 top-1/2 -translate-y-1/2 text-gaming-400" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search for a food..."
                class="w-full bg-gaming-950/80 border border-gaming-700/40 rounded-xl py-2.5 pl-10 pr-10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-gaming-500/50 input-gaming"
                @input="onSearchInput"
              />
              <button v-if="searchQuery" class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors" @click="searchQuery = ''; results = []; hasSearched = false">
                <Icon name="heroicons:x-mark" size="1.1rem" />
              </button>
            </div>

            <div v-if="isSearching" class="flex justify-center py-8">
              <Icon name="line-md:loading-loop" size="2rem" class="text-gaming-400" />
            </div>

            <div v-else-if="hasSearched && results.length === 0" class="text-center py-8 text-white/40 text-sm">
              No results found for "{{ searchQuery }}"
            </div>

            <div v-else class="mt-3 space-y-1.5">
              <div
                v-for="result in results"
                :key="result.food_id"
                class="flex items-center gap-3 p-3 rounded-xl bg-gaming-950/40 border border-gaming-800/20 hover:border-gaming-600/40 hover:bg-gaming-950/60 transition-all cursor-pointer group"
                @click="selectResult(result.food_id)"
              >
                <div class="w-8 h-8 rounded-lg bg-gaming-800/40 flex items-center justify-center shrink-0">
                  <Icon name="mdi:food-apple" size="1.1rem" class="text-gaming-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold text-white truncate">{{ result.food_name }}</div>
                  <div class="text-xs text-white/40 truncate">{{ result.food_description }}</div>
                </div>
                <Icon name="heroicons:chevron-right" size="1rem" class="text-white/20 group-hover:text-gaming-400 transition-colors shrink-0" />
              </div>
            </div>
          </div>

          <div v-else class="p-4">
            <div v-if="isFetchingDetails" class="flex justify-center py-8">
              <Icon name="line-md:loading-loop" size="2rem" class="text-gaming-400" />
            </div>

            <template v-else>
              <div class="text-xs text-white/40 mb-3 uppercase tracking-wider font-semibold">Serving Size</div>

              <div class="grid grid-cols-2 gap-2 mb-4">
                <button
                  v-for="(serving, idx) in servings"
                  :key="serving.serving_id"
                  class="p-2.5 rounded-xl border text-left transition-all"
                  :class="selectedServingIndex === idx
                    ? 'bg-gaming-700/40 border-gaming-500/60 shadow-sm shadow-gaming-500/20'
                    : 'bg-gaming-950/40 border-gaming-800/20 hover:border-gaming-700/40'"
                  @click="selectedServingIndex = idx"
                >
                  <div class="text-xs font-semibold text-white">{{ serving.measurement_description }}</div>
                  <div class="text-[11px] text-white/40">{{ Math.round(serving.calories) }} kcal</div>
                </button>
              </div>

              <div class="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold">Quantity</div>
              <div class="flex items-center gap-3 mb-4">
                <button
                  class="w-9 h-9 rounded-xl bg-gaming-950/80 border border-gaming-700/40 flex items-center justify-center text-white hover:bg-gaming-700/40 transition-colors"
                  @click="quantity = Math.max(0.25, +(quantity - 0.25).toFixed(2))"
                >
                  <Icon name="heroicons:minus" size="1rem" />
                </button>
                <input
                  v-model.number="quantity"
                  type="number"
                  min="0.25"
                  step="0.25"
                  class="w-20 text-center bg-gaming-950/80 border border-gaming-700/40 rounded-xl py-2 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-gaming-500/50 input-gaming"
                />
                <button
                  class="w-9 h-9 rounded-xl bg-gaming-950/80 border border-gaming-700/40 flex items-center justify-center text-white hover:bg-gaming-700/40 transition-colors"
                  @click="quantity = Math.min(99, +(quantity + 0.25).toFixed(2))"
                >
                  <Icon name="heroicons:plus" size="1rem" />
                </button>
              </div>

              <div v-if="scaledNutrition" class="bg-gaming-950/60 rounded-xl p-3 border border-gaming-800/20 mb-4">
                <div class="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold">Nutrition for {{ quantity }} × {{ selectedServing?.measurement_description }}</div>
                <div class="grid grid-cols-3 gap-2">
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-gaming-300">{{ scaledNutrition.calories }}</div>
                    <div class="text-[10px] text-white/40">kcal</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">{{ scaledNutrition.fat }}g</div>
                    <div class="text-[10px] text-white/40">Fat</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">{{ scaledNutrition.protein }}g</div>
                    <div class="text-[10px] text-white/40">Protein</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">{{ scaledNutrition.carbohydrate }}g</div>
                    <div class="text-[10px] text-white/40">Carbs</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">{{ scaledNutrition.sugar }}g</div>
                    <div class="text-[10px] text-white/40">Sugar</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">{{ scaledNutrition.sodium }}mg</div>
                    <div class="text-[10px] text-white/40">Sodium</div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div v-if="selectedFoodDetails && !isFetchingDetails" class="shrink-0 border-t border-gaming-700/30 p-4 bg-gaming-950/40">
          <div class="flex gap-3">
            <UButton
              label="Cancel"
              color="neutral"
              class="flex-1 btn-gaming text-sm cursor-pointer bg-gaming-950/60 hover:bg-gaming-800/60 text-white font-semibold py-2.5 rounded-xl border border-gaming-700/30 transition-all"
              @click="close"
            />
            <UButton
              label="Add Food"
              icon="heroicons:check"
              class="flex-1 btn-gaming text-sm cursor-pointer bg-gaming-600 hover:bg-gaming-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-gaming-900/50 border border-gaming-500/30 transition-all"
              @click="submitFood"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
