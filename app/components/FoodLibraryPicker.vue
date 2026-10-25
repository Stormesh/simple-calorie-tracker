<script setup lang="ts">
interface IFoodLibraryPickerProps {
  /** Which library to browse: your own foods, or the shared community one. */
  source: "mine" | "community";
}

const props = defineProps<IFoodLibraryPickerProps>();

const emit = defineEmits<{
  /** The caller writes the payload into its cookie slot and closes the modal. */
  confirm: [food: IFoodTemplate];
  /** Cancel: dismiss the modal without writing anything. */
  close: [];
}>();

const isCommunity = computed(() => props.source === "community");

const { searchFoods } = useCustomFoods();
const { searchCommunity, flagFood } = useCommunityFoods();
const toast = useToast();

const query = ref("");
const communityResults = ref<ICustomFood[]>([]);
const isSearching = ref(false);

/**
 * Selection lives here, not in the modal, so each tab keeps its own. Sharing one
 * `selected` between the tabs meant a community entry opened in "My Foods" was
 * badged Custom and saved as one of your own.
 */
const selected = ref<ICustomFood | null>(null);
const selectedServingIndex = ref(0);
const quantity = ref(1);

/** Your own foods filter synchronously; community results come from the API. */
const results = computed(() =>
  isCommunity.value ? communityResults.value : searchFoods(query.value),
);

/** True only when there is nothing to browse yet, as opposed to nothing matching. */
const libraryEmpty = computed(() => !isCommunity.value && searchFoods("").length === 0);

const servings = computed(() => (selected.value ? getCustomFoodServings(selected.value) : []));

const selectedServing = computed(() => servings.value[selectedServingIndex.value] || null);

/** Empty field emits 0; fall back to one serving so the preview never reads as zero. */
const effectiveQuantity = computed(() => quantity.value || 1);

const scaledNutrition = computed(() => {
  const serving = selectedServing.value;
  if (!serving) return null;
  const q = effectiveQuantity.value;
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

/** One-line description for a row: `<kcal> kcal · <serving> (<grams>g)`. */
const servingLabel = (food: ICustomFood): string => {
  const [serving] = getCustomFoodServings(food);
  return `${serving!.calories} kcal · ${serving!.servingDescription} (${serving!.servingGrams}g)`;
};

const select = (food: ICustomFood) => {
  selected.value = food;
  selectedServingIndex.value = 0;
  quantity.value = 1;
};

const back = () => {
  selected.value = null;
};

// --- Community search (debounced, the local library needs no round trip) ---
let debounce: ReturnType<typeof setTimeout> | undefined;
let latestSearch = 0;

const runSearch = async () => {
  const trimmed = query.value.trim();
  // Typing again starts a newer search; an older response must not overwrite it.
  const searchId = ++latestSearch;

  if (!trimmed) {
    communityResults.value = [];
    isSearching.value = false;
    return;
  }

  isSearching.value = true;
  const foods = await searchCommunity(trimmed);
  if (searchId !== latestSearch) return;

  communityResults.value = foods;
  isSearching.value = false;
};

watch(query, () => {
  if (!isCommunity.value) return;
  clearTimeout(debounce);
  debounce = setTimeout(runSearch, 400);
});

onBeforeUnmount(() => clearTimeout(debounce));

// --- Flagging ---
const flaggedFoods = ref(new Set<string>());
const pendingFlagId = ref<string | null>(null);
const flagReason = ref("");
const isSubmittingFlag = ref(false);

/** Flagging opens an inline reason box; the API rejects a blank reason. */
const startFlag = (food: ICustomFood) => {
  pendingFlagId.value = food.id;
  flagReason.value = "";
};

const cancelFlag = () => {
  pendingFlagId.value = null;
  flagReason.value = "";
};

const submitFlag = async (food: ICustomFood) => {
  const reason = flagReason.value.trim();
  if (!reason || isSubmittingFlag.value) return;

  isSubmittingFlag.value = true;
  const result = await flagFood(food.id, reason);
  isSubmittingFlag.value = false;

  if (result.status === "flagged") {
    flaggedFoods.value.add(food.id);
    toast.add({
      title: "Food flagged",
      description: "A moderator will review this entry",
      icon: "heroicons:flag",
    });
  } else if (result.status === "already-flagged") {
    flaggedFoods.value.add(food.id);
    toast.add({
      title: "Already flagged",
      description: "You have already reported this entry",
      icon: "heroicons:information-circle",
    });
  } else if (result.status === "rate-limited") {
    toast.add({
      title: "Too many reports",
      description: `You can report another entry in ${formatRetryDelay(result.retryAt)}.`,
      icon: "heroicons:clock",
    });
  } else {
    toast.add({
      title: "Failed to flag",
      description: "Please try again in a moment",
      icon: "heroicons:exclamation-triangle",
    });
  }

  cancelFlag();
};

// --- Submission ---
const confirmSelection = () => {
  const food = selected.value;
  const serving = selectedServing.value;
  const scaled = scaledNutrition.value;
  if (!food || !serving || !scaled) return;

  emit("confirm", {
    foodName: food.foodName,
    foodId: food.id,
    servingId: food.id,
    servingDescription: serving.servingDescription,
    isCustom: true,
    grams: scaled.grams,
    calories: scaled.calories,
    totalFat: scaled.fat,
    cholesterol: scaled.cholesterol,
    sodium: scaled.sodium,
    totalCarbohydrate: scaled.carbohydrate,
    sugars: scaled.sugar,
    protein: scaled.protein,
  });
};
</script>

<template>
  <div>
    <!-- Food list -->
    <div v-if="!selected">
      <div class="relative mb-3">
        <Icon
          name="heroicons:magnifying-glass"
          size="1.2rem"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gaming-400"
        />
        <input
          v-model="query"
          type="text"
          :placeholder="isCommunity ? 'Search community foods...' : 'Search your foods...'"
          class="w-full bg-gaming-950/80 border border-gaming-700/40 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-gaming-500/50 input-gaming"
        />
      </div>

      <div v-if="isSearching" class="flex justify-center py-8">
        <Icon name="line-md:loading-loop" size="2rem" class="text-gaming-400" />
      </div>

      <div
        v-else-if="libraryEmpty"
        class="text-center py-8 text-white/40 text-sm flex items-center justify-center flex-col"
      >
        <Icon name="mdi:food-apple" size="2rem" class="mb-2 text-gaming-500/50" />
        No custom foods yet. Create one in My Food Library.
      </div>

      <div v-else-if="results.length === 0" class="text-center py-8 text-white/40 text-sm">
        <template v-if="isCommunity">
          <Icon name="heroicons:globe-alt" size="2rem" class="mx-auto mb-2 text-gaming-500/50" />
          <template v-if="query.trim()"> No community foods found for "{{ query }}" </template>
          <template v-else> Search the community food database above. </template>
        </template>
        <template v-else> No custom foods found for "{{ query }}" </template>
      </div>

      <div v-else class="space-y-1.5">
        <div v-for="food in results" :key="food.id">
          <div
            class="flex items-center gap-3 p-3 rounded-xl bg-gaming-950/40 border border-gaming-800/20 hover:border-gaming-600/40 hover:bg-gaming-950/60 transition-all cursor-pointer group"
            @click="select(food)"
          >
            <div
              class="w-8 h-8 rounded-lg bg-gaming-800/40 flex items-center justify-center shrink-0"
            >
              <Icon name="mdi:food-apple" size="1.1rem" class="text-gaming-400" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-white truncate">
                {{ food.foodName }}
              </div>
              <div class="text-xs text-white/40 truncate">
                {{ servingLabel(food) }}
                <span v-if="isCommunity && food.submittedBy"> · by {{ food.submittedBy }}</span>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <template v-if="isCommunity">
                <button
                  v-if="!flaggedFoods.has(food.id)"
                  class="p-1.5 rounded-lg hover:bg-hp-red/20 transition-colors text-white/30 hover:text-hp-red cursor-pointer"
                  title="Flag as inappropriate"
                  @click.stop="startFlag(food)"
                >
                  <Icon name="heroicons:flag" size="1rem" />
                </button>
                <Icon v-else name="heroicons:flag" size="1rem" class="text-hp-red" />
              </template>
              <span class="text-[10px] uppercase tracking-wider text-gaming-500 font-semibold">
                {{ isCommunity ? "Community" : "Custom" }}
              </span>
              <Icon
                name="heroicons:chevron-right"
                size="1rem"
                class="text-white/20 group-hover:text-gaming-400 transition-colors"
              />
            </div>
          </div>

          <!-- A reason is required, so flagging opens a box rather than
               reporting on a single click. -->
          <div
            v-if="isCommunity && pendingFlagId === food.id"
            class="mt-1.5 p-3 rounded-xl bg-gaming-950/60 border border-hp-red/30 space-y-2"
          >
            <textarea
              v-model="flagReason"
              rows="2"
              maxlength="500"
              placeholder="What is wrong with this entry? (required)"
              class="w-full bg-gaming-950/80 border border-gaming-700/40 rounded-lg p-2 text-white placeholder:text-white/30 text-xs focus:outline-none focus:ring-2 focus:ring-hp-red/40 resize-none"
              @click.stop
            />
            <div class="flex justify-end gap-2">
              <button
                class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/60 hover:text-white hover:bg-gaming-800/60 transition-colors cursor-pointer"
                @click.stop="cancelFlag"
              >
                Cancel
              </button>
              <button
                class="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-hp-red/80 hover:bg-hp-red disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                :disabled="!flagReason.trim() || isSubmittingFlag"
                @click.stop="submitFlag(food)"
              >
                Submit report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected food: servings, quantity, preview -->
    <div v-else>
      <div class="flex items-center gap-2 mb-3">
        <button class="text-gaming-400 hover:text-white transition-colors" @click="back">
          <Icon name="heroicons:arrow-left" size="1.2rem" />
        </button>
        <span class="shimmer-text text-sm truncate font-semibold">{{ selected.foodName }}</span>
        <span class="text-[10px] uppercase tracking-wider text-gaming-500 font-semibold ml-auto">
          {{ isCommunity ? "Community" : "Custom" }}
        </span>
      </div>

      <template v-if="servings.length > 1">
        <div class="text-xs text-white/40 mb-2 uppercase tracking-wider font-semibold">
          Serving Size
        </div>
        <div class="grid grid-cols-2 gap-2 mb-4">
          <button
            v-for="(serving, idx) in servings"
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
      </template>

      <FoodQuantityAdjuster v-model="quantity" />

      <FoodNutritionPreview
        v-if="scaledNutrition"
        :title="`Nutrition for ${effectiveQuantity} × ${selectedServing?.servingDescription || 'serving'}`"
        :calories="scaledNutrition.calories"
        :fat="scaledNutrition.fat"
        :protein="scaledNutrition.protein"
        :carbohydrate="scaledNutrition.carbohydrate"
        :sugar="scaledNutrition.sugar"
        :sodium="scaledNutrition.sodium"
      />

      <div class="flex gap-3">
        <UButton
          label="Cancel"
          color="neutral"
          class="flex-1 btn-gaming text-sm cursor-pointer bg-gaming-950/60 hover:bg-gaming-800/60 text-white font-semibold py-2.5 rounded-xl border border-gaming-700/30 transition-all"
          @click="emit('close')"
        />
        <UButton
          label="Add Food"
          icon="heroicons:check"
          class="flex-1 btn-gaming text-sm cursor-pointer bg-gaming-600 hover:bg-gaming-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-gaming-900/50 border border-gaming-500/30 transition-all"
          @click="confirmSelection"
        />
      </div>
    </div>
  </div>
</template>
