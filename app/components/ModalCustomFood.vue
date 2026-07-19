<script setup lang="ts">
interface IModalProps {
  open?: boolean;
  editFood?: ICustomFood;
  showCommunityToggle?: boolean;
  onSave?: (
    food: ICustomFoodForm & {
      shareToCommunity?: boolean;
      nickname?: string;
      editId?: string;
    },
  ) => void;
}

const props = withDefaults(defineProps<IModalProps>(), {
  open: false,
  editFood: undefined,
  showCommunityToggle: false,
  onSave: undefined,
});

const emit = defineEmits<{
  close: [value: boolean];
  save: [
    food: ICustomFoodForm & {
      shareToCommunity?: boolean;
      nickname?: string;
      editId?: string;
    },
  ];
}>();

const emptyServing = (): ICustomFoodServing => ({
  servingDescription: "",
  servingGrams: 100,
  calories: 0,
  totalFat: 0,
  cholesterol: 0,
  sodium: 0,
  totalCarbohydrate: 0,
  sugars: 0,
  protein: 0,
});

const existingServings = props.editFood
  ? getCustomFoodServings(props.editFood).map((s) => ({ ...s }))
  : [emptyServing()];

const form = ref({
  foodName: props.editFood?.foodName || "",
  servings: existingServings,
});

const shareToCommunity = ref(false);
const nickname = ref("");

const isFormValid = computed(() => {
  if (form.value.foodName.trim() === "") return false;
  if (form.value.servings.length === 0) return false;
  return form.value.servings.every((s) => s.servingGrams > 0);
});

const addServing = () => {
  form.value.servings.push(emptyServing());
};

const removeServing = (index: number) => {
  if (form.value.servings.length <= 1) return;
  form.value.servings.splice(index, 1);
};

const submit = () => {
  if (!isFormValid.value) return;

  const data: ICustomFoodForm & {
    shareToCommunity?: boolean;
    nickname?: string;
    editId?: string;
  } = {
    foodName: form.value.foodName.trim(),
    servings: form.value.servings.map((s) => ({
      ...s,
      servingDescription: s.servingDescription.trim() || "serving",
    })),
    shareToCommunity: shareToCommunity.value,
    nickname: shareToCommunity.value
      ? nickname.value.trim() || undefined
      : undefined,
    editId: props.editFood?.id,
  };

  props.onSave?.(data);
  emit("close", false);
};

const close = () => {
  emit("close", false);
};
</script>

<template>
  <UModal
    :open="open"
    :ui="{
      content:
        'modal-gaming rounded-2xl shadow-2xl shadow-gaming-900/60 border-0 max-w-lg',
    }"
    @close="close"
  >
    <template #content>
      <div class="overflow-hidden rounded-2xl flex flex-col max-h-[85vh]">
        <div
          class="section-header text-base font-black text-gaming-300 text-center py-3 px-6 bg-gaming-900/80 border-b border-gaming-700/30 tracking-widest shrink-0"
        >
          <span class="shimmer-text">{{
            editFood ? "Edit Food" : "New Custom Food"
          }}</span>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div
            class="bg-gaming-950/40 rounded-xl p-3 border border-gaming-800/20 space-y-2"
          >
            <h3
              class="text-sm font-semibold text-gaming-400 mb-2 uppercase tracking-wider"
            >
              Food Info
            </h3>
            <UInput
              v-model="form.foodName"
              placeholder="Food name"
              type="text"
              required
              size="md"
              class="w-full"
              :ui="{
                base: 'bg-gaming-950/80 border-gaming-700/30 text-white placeholder:text-white/30 rounded-lg input-gaming',
              }"
            />
          </div>

          <div
            v-for="(serving, sIdx) in form.servings"
            :key="sIdx"
            class="bg-gaming-950/40 rounded-xl p-3 border border-gaming-800/20 space-y-2"
          >
            <div class="flex items-center justify-between mb-1">
              <h3
                class="text-sm font-semibold text-gaming-400 uppercase tracking-wider"
              >
                Serving {{ sIdx + 1 }}
              </h3>
              <button
                v-if="form.servings.length > 1"
                class="text-xs text-hp-red/70 hover:text-hp-red transition-colors cursor-pointer"
                @click="removeServing(sIdx)"
              >
                <Icon name="heroicons:x-mark" size="1.1rem" />
              </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <UInput
                v-model="serving.servingDescription"
                placeholder="e.g. 1 cup, 1 piece"
                type="text"
                size="md"
                class="w-full"
                :ui="{
                  base: 'bg-gaming-950/80 border-gaming-700/30 text-white placeholder:text-white/30 rounded-lg input-gaming',
                }"
              />
              <UInput
                v-model.number="serving.servingGrams"
                placeholder="Grams per serving"
                type="number"
                min="1"
                size="md"
                class="w-full"
                :ui="{
                  base: 'bg-gaming-950/80 border-gaming-700/30 text-white placeholder:text-white/30 rounded-lg input-gaming',
                }"
              />
              <UInput
                v-model.number="serving.calories"
                placeholder="Calories (kcal)"
                type="number"
                min="0"
                size="md"
                class="w-full"
                :ui="{
                  base: 'bg-gaming-950/80 border-gaming-700/30 text-white placeholder:text-white/30 rounded-lg input-gaming',
                }"
              />
              <UInput
                v-model.number="serving.totalFat"
                placeholder="Total Fat (g)"
                type="number"
                min="0"
                size="md"
                class="w-full"
                :ui="{
                  base: 'bg-gaming-950/80 border-gaming-700/30 text-white placeholder:text-white/30 rounded-lg input-gaming',
                }"
              />
              <UInput
                v-model.number="serving.protein"
                placeholder="Protein (g)"
                type="number"
                min="0"
                size="md"
                class="w-full"
                :ui="{
                  base: 'bg-gaming-950/80 border-gaming-700/30 text-white placeholder:text-white/30 rounded-lg input-gaming',
                }"
              />
              <UInput
                v-model.number="serving.totalCarbohydrate"
                placeholder="Carbs (g)"
                type="number"
                min="0"
                size="md"
                class="w-full"
                :ui="{
                  base: 'bg-gaming-950/80 border-gaming-700/30 text-white placeholder:text-white/30 rounded-lg input-gaming',
                }"
              />
              <UInput
                v-model.number="serving.sugars"
                placeholder="Sugars (g)"
                type="number"
                min="0"
                size="md"
                class="w-full"
                :ui="{
                  base: 'bg-gaming-950/80 border-gaming-700/30 text-white placeholder:text-white/30 rounded-lg input-gaming',
                }"
              />
              <UInput
                v-model.number="serving.sodium"
                placeholder="Sodium (mg)"
                type="number"
                min="0"
                size="md"
                class="w-full"
                :ui="{
                  base: 'bg-gaming-950/80 border-gaming-700/30 text-white placeholder:text-white/30 rounded-lg input-gaming',
                }"
              />
              <UInput
                v-model.number="serving.cholesterol"
                placeholder="Cholesterol (mg)"
                type="number"
                min="0"
                size="md"
                class="w-full"
                :ui="{
                  base: 'bg-gaming-950/80 border-gaming-700/30 text-white placeholder:text-white/30 rounded-lg input-gaming',
                }"
              />
            </div>
          </div>

          <button
            class="w-full py-2 rounded-xl border-2 border-dashed border-gaming-700/30 text-gaming-400 hover:text-gaming-300 hover:border-gaming-600/40 text-sm font-semibold transition-all cursor-pointer"
            @click="addServing"
          >
            <Icon name="heroicons:plus" size="1rem" class="inline mr-1" />
            Add Serving
          </button>

          <div
            v-if="showCommunityToggle"
            class="bg-gaming-950/40 rounded-xl p-3 border border-gaming-800/20 space-y-2"
          >
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="shareToCommunity"
                type="checkbox"
                class="w-4 h-4 rounded border-gaming-700/40 bg-gaming-950/80 text-gaming-500 focus:ring-gaming-500/50"
              />
              <span class="text-sm font-semibold text-white"
                >Submit to community</span
              >
            </label>
            <p class="text-xs text-white/40 ml-7">
              Share this food with everyone. Others will be able to search and
              use it.
            </p>
            <UInput
              v-if="shareToCommunity"
              v-model="nickname"
              placeholder="Your nickname (optional)"
              type="text"
              size="md"
              class="w-full"
              :ui="{
                base: 'bg-gaming-950/80 border-gaming-700/30 text-white placeholder:text-white/30 rounded-lg input-gaming',
              }"
            />
          </div>
        </div>

        <div
          class="shrink-0 border-t border-gaming-700/30 p-4 bg-gaming-950/40"
        >
          <div class="flex gap-3">
            <UButton
              label="Cancel"
              color="neutral"
              class="flex-1 btn-gaming text-sm cursor-pointer bg-gaming-950/60 hover:bg-gaming-800/60 text-white font-semibold py-2.5 rounded-xl border border-gaming-700/30 transition-all"
              @click="close"
            />
            <UButton
              label="Save"
              :disabled="!isFormValid"
              icon="heroicons:check"
              class="flex-1 btn-gaming text-sm cursor-pointer bg-gaming-600 hover:bg-gaming-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-gaming-900/50 border border-gaming-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              @click="submit"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
