<script setup lang="ts">
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

/**
 * Every tab reports the same payload shape, so a pick is written to the slot in
 * one place whatever produced it.
 */
const applyPick = (picked: IFoodTemplate) => {
  const foodItem = foods.value[props.index];
  if (foodItem) Object.assign(foodItem, picked);

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
    :ui="{
      content: 'modal-gaming rounded-2xl shadow-2xl shadow-gaming-900/60 border-0 max-w-lg',
    }"
    @close="close"
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
          <!-- v-show, not v-if: each tab keeps its search text and selection
               while you peek at another one. -->
          <div v-show="activeTab === 'api'">
            <FoodApiPicker
              :initial-food-details="initialFoodDetails"
              :edit-mode="editMode"
              @confirm="applyPick"
              @close="close"
            />
          </div>

          <div v-show="activeTab === 'my-foods'">
            <FoodLibraryPicker source="mine" @confirm="applyPick" @close="close" />
          </div>

          <div v-show="activeTab === 'community'">
            <FoodLibraryPicker source="community" @confirm="applyPick" @close="close" />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
