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
  editMode?: boolean;
}

type TabId = "api" | "my-foods" | "community";

const props = defineProps<IModalProps>();
const emit = defineEmits<{ close: [value: boolean] }>();

const foods = useCookie<IFoodTemplate[]>(props.cookieName, {
  default: () => foodArrayDefault(),
});

const activeTab = ref<TabId>("api");

const searchQuery = ref("");
const results = ref<ISearchResult[]>([]);
const isSearching = ref(false);
const hasSearched = ref(false);

const selectedFoodDetails = ref<IFoodDetails | null>(
  props.initialFoodDetails || null,
);
const isFetchingDetails = ref(false);

const selectedServingIndex = ref(0);
const quantity = ref(1);

const servings = computed(
  () => selectedFoodDetails.value?.servings?.serving || [],
);

const selectedServing = computed(
  () => servings.value[selectedServingIndex.value] || null,
);

const scaledNutrition = computed(() => {
  const serving = selectedServing.value;
  if (!serving) return null;
  const quantityValue = quantity.value || 0;
  return {
    grams:
      Math.round((serving.metric_serving_amount || 0) * quantityValue * 10) /
      10,
    calories: Math.round((serving.calories || 0) * quantityValue),
    fat: Math.round((serving.fat || 0) * quantityValue * 10) / 10,
    protein: Math.round((serving.protein || 0) * quantityValue * 10) / 10,
    carbohydrate:
      Math.round((serving.carbohydrate || 0) * quantityValue * 10) / 10,
    sugar: Math.round((serving.sugar || 0) * quantityValue * 10) / 10,
    sodium: Math.round((serving.sodium || 0) * quantityValue * 10) / 10,
    cholesterol:
      Math.round((serving.cholesterol || 0) * quantityValue * 10) / 10,
  };
});

const { searchFoods: searchCustomFoods } = useCustomFoods();
const customSearchQuery = ref("");
const customResults = computed(() =>
  searchCustomFoods(customSearchQuery.value),
);

// --- Community tab state ---
const { searchCommunity } = useCommunityFoods();
const { flagFood } = useCommunityFoods();
const toast = useToast();
const communitySearchQuery = ref("");
const communityResults = ref<ICustomFood[]>([]);
const isSearchingCommunity = ref(false);
const hasSearchedCommunity = ref(false);
const flaggedFoods = ref(new Set<string>());

let communityDebounce: ReturnType<typeof setTimeout>;

const handleFlag = async (food: ICustomFood) => {
  const result = await flagFood(food.id);
  if (result) {
    flaggedFoods.value.add(food.id);
    toast.add({ title: "Food flagged", description: "A moderator will review this entry", icon: "heroicons:flag" });
  } else {
    toast.add({ title: "Failed to flag", description: "You may have already flagged this food", icon: "heroicons:exclamation-triangle" });
  }
};

const doCommunitySearch = async () => {
  const query = communitySearchQuery.value.trim();
  if (!query) {
    communityResults.value = [];
    hasSearchedCommunity.value = false;
    return;
  }

  isSearchingCommunity.value = true;
  hasSearchedCommunity.value = true;
  communityResults.value = await searchCommunity(query);
  isSearchingCommunity.value = false;
};

watch(communitySearchQuery, () => {
  clearTimeout(communityDebounce);
  communityDebounce = setTimeout(doCommunitySearch, 400);
});

// --- Food selection for custom/community foods (multi-serving) ---
const selectedCustomFood = ref<ICustomFood | null>(null);

const customServings = computed(() => {
  const food = selectedCustomFood.value;
  if (!food) return [];
  return getCustomFoodServings(food);
});

const selectedCustomServing = computed(
  () => customServings.value[selectedServingIndex.value] || null,
);

const selectCustomFood = (food: ICustomFood) => {
  selectedCustomFood.value = food;
  selectedServingIndex.value = 0;
  quantity.value = 1;
};

const customScaledNutrition = computed(() => {
  const serving = selectedCustomServing.value;
  if (!serving) return null;
  const q = quantity.value || 0;
  return {
    grams: Math.round(serving.servingGrams * q * 10) / 10,
    calories: Math.round(serving.calories * q),
    fat: Math.round(serving.totalFat * q * 10) / 10,
    protein: Math.round(serving.protein * q * 10) / 10,
    carbohydrate: Math.round(serving.totalCarbohydrate * q * 10) / 10,
    sugar: Math.round(serving.sugars * q * 10) / 10,
    sodium: Math.round(serving.sodium * q * 10) / 10,
    cholesterol: Math.round(serving.cholesterol * q * 10) / 10,
  };
});

const resetCommunitySelection = () => {
  selectedCustomFood.value = null;
};

// --- API search ---
let debounceTimer: ReturnType<typeof setTimeout>;

const doSearch = async () => {
  const query = searchQuery.value.trim();
  if (!query) return;

  isSearching.value = true;
  hasSearched.value = true;
  selectedFoodDetails.value = null;

  try {
    const data = await searchFood(query);
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

// --- Submission ---
const submitFood = () => {
  const scaled = scaledNutrition.value;
  const selectedFood = selectedFoodDetails.value;
  if (!scaled || !selectedFood) return;

  const foodItem = foods.value[props.index];
  if (foodItem) {
    foodItem.foodName = selectedFood.food_name;
    foodItem.foodId = selectedFood.food_id;
    foodItem.servingId = selectedServing.value?.serving_id || "";
    foodItem.grams = scaled.grams;
    foodItem.calories = scaled.calories;
    foodItem.totalFat = scaled.fat;
    foodItem.cholesterol = scaled.cholesterol;
    foodItem.sodium = scaled.sodium;
    foodItem.totalCarbohydrate = scaled.carbohydrate;
    foodItem.sugars = scaled.sugar;
    foodItem.protein = scaled.protein;
    foodItem.isCustom = false;
  }

  emit("close", true);
};

const submitCustomFood = () => {
  const scaled = customScaledNutrition.value;
  const food = selectedCustomFood.value;
  const serving = selectedCustomServing.value;
  if (!scaled || !food || !serving) return;

  const foodItem = foods.value[props.index];
  if (foodItem) {
    foodItem.foodName = food.foodName;
    foodItem.foodId = food.id;
    foodItem.servingId = food.id;
    foodItem.grams = scaled.grams;
    foodItem.calories = scaled.calories;
    foodItem.totalFat = scaled.fat;
    foodItem.cholesterol = scaled.cholesterol;
    foodItem.sodium = scaled.sodium;
    foodItem.totalCarbohydrate = scaled.carbohydrate;
    foodItem.sugars = scaled.sugar;
    foodItem.protein = scaled.protein;
    foodItem.isCustom = true;
    foodItem.servingDescription = serving.servingDescription;
  }

  emit("close", true);
};

const close = () => {
  emit("close", false);
};

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "api", label: "Search API", icon: "heroicons:magnifying-glass" },
  { id: "my-foods", label: "My Foods", icon: "mdi:food-apple" },
  { id: "community", label: "Community", icon: "heroicons:globe-alt" },
];
</script>

<template>
  <UModal
    @close="close"
    :ui="{
      content:
        'modal-gaming rounded-2xl shadow-2xl shadow-gaming-900/60 border-0 max-w-lg',
    }"
  >
    <template #content>
      <div class="overflow-hidden rounded-2xl flex flex-col max-h-[85vh]">
        <!-- Header with tabs -->
        <div class="bg-gaming-900/80 border-b border-gaming-700/30 shrink-0">
          <div class="flex">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="flex-1 flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
              :class="
                activeTab === tab.id
                  ? 'text-gaming-300 border-b-2 border-gaming-500 bg-gaming-950/30'
                  : 'text-white/30 hover:text-white/60 border-b-2 border-transparent'
              "
              @click="activeTab = tab.id"
            >
              <Icon :name="tab.icon" size="1rem" />
              {{ tab.label }}
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <!-- ============ TAB: Search API ============ -->
          <div v-if="activeTab === 'api'">
            <div v-if="!selectedFoodDetails" class="p-4">
              <div class="relative">
                <Icon
                  name="heroicons:magnifying-glass"
                  size="1.2rem"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-gaming-400"
                />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search for a food..."
                  class="w-full bg-gaming-950/80 border border-gaming-700/40 rounded-xl py-2.5 pl-10 pr-10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-gaming-500/50 input-gaming"
                  @input="onSearchInput"
                  @keydown.enter="doSearch"
                />
                <button
                  v-if="searchQuery"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  @click="
                    searchQuery = '';
                    results = [];
                    hasSearched = false;
                  "
                >
                  <Icon name="heroicons:x-mark" size="1.1rem" />
                </button>
              </div>

              <div v-if="isSearching" class="flex justify-center py-8">
                <Icon
                  name="line-md:loading-loop"
                  size="2rem"
                  class="text-gaming-400"
                />
              </div>

              <div
                v-else-if="hasSearched && results.length === 0"
                class="text-center py-8 text-white/40 text-sm"
              >
                No results found for "{{ searchQuery }}"
              </div>

              <div v-else class="mt-3 space-y-1.5">
                <div
                  v-for="result in results"
                  :key="result.food_id"
                  class="flex items-center gap-3 p-3 rounded-xl bg-gaming-950/40 border border-gaming-800/20 hover:border-gaming-600/40 hover:bg-gaming-950/60 transition-all cursor-pointer group"
                  @click="selectResult(result.food_id)"
                >
                  <div
                    class="w-8 h-8 rounded-lg bg-gaming-800/40 flex items-center justify-center shrink-0"
                  >
                    <Icon
                      name="mdi:food-apple"
                      size="1.1rem"
                      class="text-gaming-400"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-white truncate">
                      {{ result.food_name }}
                    </div>
                    <div class="text-xs text-white/40 truncate">
                      {{ result.food_description }}
                    </div>
                  </div>
                  <Icon
                    name="heroicons:chevron-right"
                    size="1rem"
                    class="text-white/20 group-hover:text-gaming-400 transition-colors shrink-0"
                  />
                </div>
              </div>
            </div>

            <div v-else class="p-4">
              <div v-if="isFetchingDetails" class="flex justify-center py-8">
                <Icon
                  name="line-md:loading-loop"
                  size="2rem"
                  class="text-gaming-400"
                />
              </div>

              <template v-else>
                <div class="flex items-center gap-2 mb-3">
                  <button
                    class="text-gaming-400 hover:text-white transition-colors"
                    @click="backToResults"
                  >
                    <Icon name="heroicons:arrow-left" size="1.2rem" />
                  </button>
                  <span class="shimmer-text text-sm truncate font-semibold">{{
                    selectedFoodDetails.food_name
                  }}</span>
                </div>

                <div
                  class="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold"
                >
                  Serving Size
                </div>

                <div class="grid grid-cols-2 gap-2 mb-4">
                  <button
                    v-for="(serving, idx) in servings"
                    :key="serving.serving_id"
                    class="p-2.5 rounded-xl border text-left transition-all"
                    :class="
                      selectedServingIndex === idx
                        ? 'bg-gaming-700/40 border-gaming-500/60 shadow-sm shadow-gaming-500/20'
                        : 'bg-gaming-950/40 border-gaming-800/20 hover:border-gaming-700/40'
                    "
                    @click="selectedServingIndex = idx"
                  >
                    <div class="text-xs font-semibold text-white">
                      {{ serving.measurement_description }}
                    </div>
                    <div class="text-[11px] text-white/40">
                      {{ Math.round(serving.calories) }} kcal
                    </div>
                  </button>
                </div>

                <div
                  class="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold"
                >
                  Quantity
                </div>
                <div class="flex items-center gap-3 mb-4">
                  <button
                    class="w-9 h-9 rounded-xl bg-gaming-950/80 border border-gaming-700/40 flex items-center justify-center text-white hover:bg-gaming-700/40 transition-colors"
                    @click="
                      quantity = Math.max(0.25, +(quantity - 0.25).toFixed(2))
                    "
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
                    @click="
                      quantity = Math.min(99, +(quantity + 0.25).toFixed(2))
                    "
                  >
                    <Icon name="heroicons:plus" size="1rem" />
                  </button>
                </div>

                <div
                  v-if="scaledNutrition"
                  class="bg-gaming-950/60 rounded-xl p-3 border border-gaming-800/20 mb-4"
                >
                  <div
                    class="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold"
                  >
                    Nutrition for {{ quantity }} ×
                    {{ selectedServing?.measurement_description }}
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                      <div class="text-sm font-bold text-gaming-300">
                        {{ scaledNutrition.calories }}
                      </div>
                      <div class="text-[10px] text-white/40">kcal</div>
                    </div>
                    <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                      <div class="text-sm font-bold text-white">
                        {{ scaledNutrition.fat }}g
                      </div>
                      <div class="text-[10px] text-white/40">Fat</div>
                    </div>
                    <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                      <div class="text-sm font-bold text-white">
                        {{ scaledNutrition.protein }}g
                      </div>
                      <div class="text-[10px] text-white/40">Protein</div>
                    </div>
                    <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                      <div class="text-sm font-bold text-white">
                        {{ scaledNutrition.carbohydrate }}g
                      </div>
                      <div class="text-[10px] text-white/40">Carbs</div>
                    </div>
                    <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                      <div class="text-sm font-bold text-white">
                        {{ scaledNutrition.sugar }}g
                      </div>
                      <div class="text-[10px] text-white/40">Sugar</div>
                    </div>
                    <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                      <div class="text-sm font-bold text-white">
                        {{ scaledNutrition.sodium }}mg
                      </div>
                      <div class="text-[10px] text-white/40">Sodium</div>
                    </div>
                  </div>
                </div>

                <div class="flex gap-3">
                  <UButton
                    label="Cancel"
                    color="neutral"
                    class="flex-1 btn-gaming text-sm cursor-pointer bg-gaming-950/60 hover:bg-gaming-800/60 text-white font-semibold py-2.5 rounded-xl border border-gaming-700/30 transition-all"
                    @click="close"
                  />
                  <UButton
                    :label="editMode ? 'Edit Food' : 'Add Food'"
                    icon="heroicons:check"
                    class="flex-1 btn-gaming text-sm cursor-pointer bg-gaming-600 hover:bg-gaming-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-gaming-900/50 border border-gaming-500/30 transition-all"
                    @click="submitFood"
                  />
                </div>
              </template>
            </div>
          </div>

          <!-- ============ TAB: My Foods ============ -->
          <div v-if="activeTab === 'my-foods'" class="p-4">
            <div v-if="!selectedCustomFood">
              <div class="relative mb-3">
                <Icon
                  name="heroicons:magnifying-glass"
                  size="1.2rem"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-gaming-400"
                />
                <input
                  v-model="customSearchQuery"
                  type="text"
                  placeholder="Search your foods..."
                  class="w-full bg-gaming-950/80 border border-gaming-700/40 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-gaming-500/50 input-gaming"
                />
              </div>

              <div
                v-if="customResults.length === 0"
                class="text-center py-8 text-white/40 text-sm flex items-center justify-center"
              >
                <Icon
                  name="mdi:food-apple"
                  size="2rem"
                  class="mb-2 text-gaming-500/50"
                />
                No custom foods yet. Create one in My Food Library.
              </div>

              <div v-else class="space-y-1.5">
                <div
                  v-for="food in customResults"
                  :key="food.id"
                  class="flex items-center gap-3 p-3 rounded-xl bg-gaming-950/40 border border-gaming-800/20 hover:border-gaming-600/40 hover:bg-gaming-950/60 transition-all cursor-pointer group"
                  @click="selectCustomFood(food)"
                >
                  <div
                    class="w-8 h-8 rounded-lg bg-gaming-800/40 flex items-center justify-center shrink-0"
                  >
                    <Icon
                      name="mdi:food-apple"
                      size="1.1rem"
                      class="text-gaming-400"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-white truncate">
                      {{ food.foodName }}
                    </div>
                    <div class="text-xs text-white/40 truncate">
                      {{ getCustomFoodServings(food)[0]!.calories }} kcal ·
                      {{ getCustomFoodServings(food)[0]!.servingDescription }} ({{ getCustomFoodServings(food)[0]!.servingGrams }}g)
                    </div>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <span
                      class="text-[10px] uppercase tracking-wider text-gaming-500 font-semibold"
                      >Custom</span
                    >
                    <Icon
                      name="heroicons:chevron-right"
                      size="1rem"
                      class="text-white/20 group-hover:text-gaming-400 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div v-else>
              <div class="flex items-center gap-2 mb-3">
                <button
                  class="text-gaming-400 hover:text-white transition-colors"
                  @click="selectedCustomFood = null"
                >
                  <Icon name="heroicons:arrow-left" size="1.2rem" />
                </button>
                <span class="shimmer-text text-sm truncate font-semibold">{{
                  selectedCustomFood.foodName
                }}</span>
                <span
                  class="text-[10px] uppercase tracking-wider text-gaming-500 font-semibold ml-auto"
                  >Custom</span
                >
              </div>

              <div
                v-if="customServings.length > 1"
                class="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold"
              >
                Serving Size
              </div>
              <div
                v-if="customServings.length > 1"
                class="grid grid-cols-2 gap-2 mb-4"
              >
                <button
                  v-for="(serving, idx) in customServings"
                  :key="idx"
                  class="p-2.5 rounded-xl border text-left transition-all"
                  :class="
                    selectedServingIndex === idx
                      ? 'bg-gaming-700/40 border-gaming-500/60 shadow-sm shadow-gaming-500/20'
                      : 'bg-gaming-950/40 border-gaming-800/20 hover:border-gaming-700/40'
                  "
                  @click="selectedServingIndex = idx"
                >
                  <div class="text-xs font-semibold text-white">
                    {{ serving.servingDescription || "serving" }}
                  </div>
                  <div class="text-[11px] text-white/40">
                    {{ Math.round(serving.calories) }} kcal
                    {{ serving.servingGrams ? `· ${serving.servingGrams}g` : "" }}
                  </div>
                </button>
              </div>

              <div
                class="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold"
              >
                Quantity
              </div>
              <div class="flex items-center gap-3 mb-4">
                <button
                  class="w-9 h-9 rounded-xl bg-gaming-950/80 border border-gaming-700/40 flex items-center justify-center text-white hover:bg-gaming-700/40 transition-colors"
                  @click="
                    quantity = Math.max(0.25, +(quantity - 0.25).toFixed(2))
                  "
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
                  @click="
                    quantity = Math.min(99, +(quantity + 0.25).toFixed(2))
                  "
                >
                  <Icon name="heroicons:plus" size="1rem" />
                </button>
              </div>

              <div
                v-if="customScaledNutrition"
                class="bg-gaming-950/60 rounded-xl p-3 border border-gaming-800/20 mb-4"
              >
                <div
                  class="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold"
                >
                  Nutrition for {{ quantity }} ×
                  {{ selectedCustomServing?.servingDescription || "serving" }}
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-gaming-300">
                      {{ customScaledNutrition.calories }}
                    </div>
                    <div class="text-[10px] text-white/40">kcal</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">
                      {{ customScaledNutrition.fat }}g
                    </div>
                    <div class="text-[10px] text-white/40">Fat</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">
                      {{ customScaledNutrition.protein }}g
                    </div>
                    <div class="text-[10px] text-white/40">Protein</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">
                      {{ customScaledNutrition.carbohydrate }}g
                    </div>
                    <div class="text-[10px] text-white/40">Carbs</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">
                      {{ customScaledNutrition.sugar }}g
                    </div>
                    <div class="text-[10px] text-white/40">Sugar</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">
                      {{ customScaledNutrition.sodium }}mg
                    </div>
                    <div class="text-[10px] text-white/40">Sodium</div>
                  </div>
                </div>
              </div>

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
                  @click="submitCustomFood"
                />
              </div>
            </div>
          </div>

          <!-- ============ TAB: Community ============ -->
          <div v-if="activeTab === 'community'" class="p-4">
            <div v-if="!selectedCustomFood">
              <div class="relative mb-3">
                <Icon
                  name="heroicons:magnifying-glass"
                  size="1.2rem"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-gaming-400"
                />
                <input
                  v-model="communitySearchQuery"
                  type="text"
                  placeholder="Search community foods..."
                  class="w-full bg-gaming-950/80 border border-gaming-700/40 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-gaming-500/50 input-gaming"
                />
              </div>

              <div v-if="isSearchingCommunity" class="flex justify-center py-8">
                <Icon
                  name="line-md:loading-loop"
                  size="2rem"
                  class="text-gaming-400"
                />
              </div>

              <div
                v-else-if="
                  hasSearchedCommunity && communityResults.length === 0
                "
                class="text-center py-8 text-white/40 text-sm"
              >
                <Icon
                  name="heroicons:globe-alt"
                  size="2rem"
                  class="mx-auto mb-2 text-gaming-500/50"
                />
                No community foods found for "{{ communitySearchQuery }}"
              </div>

              <div v-else-if="communityResults.length > 0" class="space-y-1.5">
                <div
                  v-for="food in communityResults"
                  :key="food.id"
                  class="flex items-center gap-3 p-3 rounded-xl bg-gaming-950/40 border border-gaming-800/20 hover:border-gaming-600/40 hover:bg-gaming-950/60 transition-all cursor-pointer group"
                  @click="selectCustomFood(food)"
                >
                  <div
                    class="w-8 h-8 rounded-lg bg-gaming-800/40 flex items-center justify-center shrink-0"
                  >
                    <Icon
                      name="mdi:food-apple"
                      size="1.1rem"
                      class="text-gaming-400"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-white truncate">
                      {{ food.foodName }}
                    </div>
                    <div class="text-xs text-white/40 truncate">
                      {{ getCustomFoodServings(food)[0]!.calories }} kcal ·
                      {{ getCustomFoodServings(food)[0]!.servingDescription }} ({{ getCustomFoodServings(food)[0]!.servingGrams }}g)
                      <span v-if="food.submittedBy">
                        · by {{ food.submittedBy }}</span
                      >
                    </div>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button
                      v-if="!flaggedFoods.has(food.id)"
                      class="p-1.5 rounded-lg hover:bg-hp-red/20 transition-colors text-white/30 hover:text-hp-red cursor-pointer"
                      title="Flag as inappropriate"
                      @click.stop="handleFlag(food)"
                    >
                      <Icon name="heroicons:flag" size="1rem" />
                    </button>
                    <Icon
                      v-else
                      name="heroicons:flag"
                      size="1rem"
                      class="text-hp-red"
                    />
                    <span
                      class="text-[10px] uppercase tracking-wider text-gaming-500 font-semibold"
                      >Community</span
                    >
                    <Icon
                      name="heroicons:chevron-right"
                      size="1rem"
                      class="text-white/20 group-hover:text-gaming-400 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div
                v-else
                class="text-center py-12 text-white/30 text-sm flex items-center justify-center"
              >
                <Icon
                  name="heroicons:globe-alt"
                  size="2rem"
                  class="mb-2 text-gaming-500/30"
                />
                Search the community food database above.
              </div>
            </div>

            <!-- Community food selected: quantity adjustment -->
            <div v-else>
              <div class="flex items-center gap-2 mb-3">
                <button
                  class="text-gaming-400 hover:text-white transition-colors"
                  @click="resetCommunitySelection()"
                >
                  <Icon name="heroicons:arrow-left" size="1.2rem" />
                </button>
                <span class="shimmer-text text-sm truncate font-semibold">{{
                  selectedCustomFood.foodName
                }}</span>
                <span
                  class="text-[10px] uppercase tracking-wider text-gaming-500 font-semibold ml-auto"
                  >Community</span
                >
              </div>

              <div
                v-if="customServings.length > 1"
                class="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold"
              >
                Serving Size
              </div>
              <div
                v-if="customServings.length > 1"
                class="grid grid-cols-2 gap-2 mb-4"
              >
                <button
                  v-for="(serving, idx) in customServings"
                  :key="idx"
                  class="p-2.5 rounded-xl border text-left transition-all"
                  :class="
                    selectedServingIndex === idx
                      ? 'bg-gaming-700/40 border-gaming-500/60 shadow-sm shadow-gaming-500/20'
                      : 'bg-gaming-950/40 border-gaming-800/20 hover:border-gaming-700/40'
                  "
                  @click="selectedServingIndex = idx"
                >
                  <div class="text-xs font-semibold text-white">
                    {{ serving.servingDescription || "serving" }}
                  </div>
                  <div class="text-[11px] text-white/40">
                    {{ Math.round(serving.calories) }} kcal
                    {{ serving.servingGrams ? `· ${serving.servingGrams}g` : "" }}
                  </div>
                </button>
              </div>

              <div
                class="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold"
              >
                Quantity
              </div>
              <div class="flex items-center gap-3 mb-4">
                <button
                  class="w-9 h-9 rounded-xl bg-gaming-950/80 border border-gaming-700/40 flex items-center justify-center text-white hover:bg-gaming-700/40 transition-colors"
                  @click="
                    quantity = Math.max(0.25, +(quantity - 0.25).toFixed(2))
                  "
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
                  @click="
                    quantity = Math.min(99, +(quantity + 0.25).toFixed(2))
                  "
                >
                  <Icon name="heroicons:plus" size="1rem" />
                </button>
              </div>

              <div
                v-if="customScaledNutrition"
                class="bg-gaming-950/60 rounded-xl p-3 border border-gaming-800/20 mb-4"
              >
                <div
                  class="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold"
                >
                  Nutrition for {{ quantity }} ×
                  {{ selectedCustomServing?.servingDescription || "serving" }}
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-gaming-300">
                      {{ customScaledNutrition.calories }}
                    </div>
                    <div class="text-[10px] text-white/40">kcal</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">
                      {{ customScaledNutrition.fat }}g
                    </div>
                    <div class="text-[10px] text-white/40">Fat</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">
                      {{ customScaledNutrition.protein }}g
                    </div>
                    <div class="text-[10px] text-white/40">Protein</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">
                      {{ customScaledNutrition.carbohydrate }}g
                    </div>
                    <div class="text-[10px] text-white/40">Carbs</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">
                      {{ customScaledNutrition.sugar }}g
                    </div>
                    <div class="text-[10px] text-white/40">Sugar</div>
                  </div>
                  <div class="text-center p-1.5 rounded-lg bg-gaming-950/40">
                    <div class="text-sm font-bold text-white">
                      {{ customScaledNutrition.sodium }}mg
                    </div>
                    <div class="text-[10px] text-white/40">Sodium</div>
                  </div>
                </div>
              </div>

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
                  @click="submitCustomFood"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
