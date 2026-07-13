<script setup lang="ts">
import { ModalCustomFood } from "#components";

const emit = defineEmits<{ close: [] }>();

const toast = useToast();

const overlay = useOverlay();
const customFoodModal = overlay.create(ModalCustomFood);

const { foods, addFood, updateFood, deleteFood, exportToJson, importFromJson } =
  useCustomFoods();

const searchQuery = ref("");

const filteredFoods = computed(() => {
  if (!searchQuery.value.trim()) return foods.value;
  const q = searchQuery.value.toLowerCase();
  return foods.value.filter((f) => f.foodName.toLowerCase().includes(q));
});

const openForm = (food?: ICustomFood) => {
  customFoodModal.open({
    editFood: food,
    showCommunityToggle: true,
    onSave: handleSave,
  });
};

const { submitFood: submitCommunityFood } = useCommunityFoods();

const handleSave = async (
  data: ICustomFoodForm & {
    shareToCommunity?: boolean;
    nickname?: string;
    editId?: string;
  },
) => {
  const { shareToCommunity, nickname, editId, ...foodData } = data;

  if (editId) {
    updateFood(editId, foodData);
    toast.add({ title: "Food updated", icon: "heroicons:check" });
  } else {
    addFood(foodData);
    toast.add({ title: "Food added", icon: "heroicons:check" });
  }

  if (shareToCommunity) {
    const result = await submitCommunityFood({
      ...foodData,
      nickname,
    });
    if (result) {
      toast.add({
        title: "Shared with community",
        description: result.message,
        icon: "heroicons:globe-alt",
      });
    } else {
      toast.add({
        title: "Failed to share",
        description: "Could not submit to community database",
        icon: "heroicons:exclamation-triangle",
      });
    }
  }
};

const handleDelete = (food: ICustomFood) => {
  deleteFood(food.id);
  toast.add({ title: `${food.foodName} deleted`, icon: "heroicons:trash" });
};

const handleExport = () => {
  const json = exportToJson();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `custom-foods-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast.add({
    title: "Exported successfully",
    icon: "heroicons:arrow-down-tray",
  });
};

const fileInput = ref<HTMLInputElement>();

const handleImport = () => {
  fileInput.value?.click();
};

const onFileSelected = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const result = importFromJson(reader.result as string);
    const msg = `Imported ${result.imported} foods`;
    if (result.skipped > 0)
      toast.add({
        title: msg,
        description: `${result.skipped} skipped (duplicates)`,
        icon: "heroicons:information-circle",
      });
    else toast.add({ title: msg, icon: "heroicons:check" });
    if (result.errors.length > 0) {
      toast.add({
        title: `${result.errors.length} errors`,
        description: result.errors[0],
        icon: "heroicons:exclamation-triangle",
      });
    }
  };
  reader.readAsText(file);
  input.value = "";
};

const close = () => {
  emit("close");
};
</script>

<template>
  <UModal
    @close="close"
    :ui="{
      content:
        'modal-gaming rounded-2xl shadow-2xl shadow-gaming-900/60 border-0 max-w-2xl',
    }"
  >
    <template #content>
      <div class="overflow-hidden rounded-2xl flex flex-col max-h-[85vh]">
        <div
          class="section-header text-base font-black text-gaming-300 py-3 px-6 bg-gaming-900/80 border-b border-gaming-700/30 tracking-widest shrink-0"
        >
          <div class="flex items-center justify-between">
            <span class="shimmer-text">My Food Library</span>
            <button
              class="text-gaming-400 hover:text-white transition-colors cursor-pointer"
              @click="close"
            >
              <Icon name="heroicons:x-mark" size="1.3rem" />
            </button>
          </div>
        </div>

        <div class="p-4 border-b border-gaming-700/30 space-y-3">
          <div class="relative">
            <Icon
              name="heroicons:magnifying-glass"
              size="1.2rem"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-gaming-400"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search your foods..."
              class="w-full bg-gaming-950/80 border border-gaming-700/40 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-gaming-500/50 input-gaming"
            />
          </div>
          <div class="flex gap-2">
            <UButton
              label="Add Food"
              icon="heroicons:plus"
              class="btn-gaming text-sm cursor-pointer bg-gaming-600 hover:bg-gaming-500 text-white font-bold py-2 px-4 rounded-xl shadow border border-gaming-500/30 transition-all"
              @click="openForm()"
            />
            <UButton
              label="Export"
              icon="heroicons:arrow-down-tray"
              class="btn-gaming text-sm cursor-pointer bg-gaming-700/60 hover:bg-gaming-600 text-white font-semibold py-2 px-4 rounded-xl border border-gaming-700/30 transition-all"
              @click="handleExport"
            />
            <UButton
              label="Import"
              icon="heroicons:arrow-up-tray"
              class="btn-gaming text-sm cursor-pointer bg-gaming-700/60 hover:bg-gaming-600 text-white font-semibold py-2 px-4 rounded-xl border border-gaming-700/30 transition-all"
              @click="handleImport"
            />
            <input
              ref="fileInput"
              type="file"
              accept=".json"
              class="hidden"
              @change="onFileSelected"
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-2">
          <div
            v-if="filteredFoods.length === 0"
            class="text-center py-12 text-white/40 text-sm flex items-center justify-center"
          >
            <Icon
              name="mdi:food-apple"
              size="2rem"
              class="mb-2 text-gaming-500/50"
            />
            No custom foods yet. Click "Add Food" to create one.
          </div>

          <div
            v-for="food in filteredFoods"
            :key="food.id"
            class="flex items-center gap-3 p-3 m-2 rounded-xl bg-gaming-950/40 border border-gaming-800/20 hover:border-gaming-600/40 transition-all"
          >
            <div
              class="w-10 h-10 rounded-lg bg-gaming-800/40 flex items-center justify-center shrink-0"
            >
              <Icon
                name="mdi:food-apple"
                size="1.2rem"
                class="text-gaming-400"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-white truncate">
                {{ food.foodName }}
              </div>
              <div class="text-xs text-white/40">
                {{ getCustomFoodServings(food)[0]!.calories }} kcal · {{ getCustomFoodServings(food)[0]!.servingDescription }} ({{
                  getCustomFoodServings(food)[0]!.servingGrams
                }}g)
              </div>
            </div>
            <div class="flex gap-1 shrink-0">
              <button
                class="p-2 rounded-lg hover:bg-gaming-700/50 transition-colors text-white/40 hover:text-gaming-400 cursor-pointer"
                @click="openForm(food)"
              >
                <Icon name="ic:outline-edit" size="1.2rem" />
              </button>
              <button
                class="p-2 rounded-lg hover:bg-hp-red/30 transition-colors text-white/40 hover:text-hp-red cursor-pointer"
                @click="handleDelete(food)"
              >
                <Icon name="ic:outline-delete" size="1.2rem" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
