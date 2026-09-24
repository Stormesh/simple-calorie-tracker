<script setup lang="ts">
import type { SettingsPanelAction } from "~/composables/settings-panel";

const emit = defineEmits<{
  close: [];
  select: [action: SettingsPanelAction];
}>();

const bmr = useBmr();
const { foods } = useCustomFoods();
const { name: playerName, avatarLetter } = usePlayerProfile();
const { theme, accent, setTheme, setAccent } = useTheme();

// Custom accent draft: UColorPicker writes only into draftAccent while the
// popover is open; setAccent (cookies + data-theme flip) runs once per real
// mouse release. A native input[type=color] can't do this — its picker is
// browser UI, so pointerup is unobservable from the page.
const accentOpen = ref(false);
const draftAccent = ref(accent.value);

const commitDraft = () => {
  if (draftAccent.value !== accent.value) setAccent(draftAccent.value);
};

watch(accentOpen, (open) => {
  if (open) {
    draftAccent.value = accent.value;
    document.addEventListener("pointerup", commitDraft);
  } else {
    // Escape / click-outside without a captured release → discard the draft.
    document.removeEventListener("pointerup", commitDraft);
  }
});

interface ISettingsItem {
  id: SettingsPanelAction;
  label: string;
  icon: string;
  description: string;
  danger?: boolean;
}

interface ISettingsSection {
  id: string;
  title: string;
  danger?: boolean;
  items: ISettingsItem[];
}

const sections = computed<ISettingsSection[]>(() => [
  {
    id: "combat",
    title: "Combat",
    items: [
      {
        id: "diet",
        label: "Diet Profile",
        icon: "mdi:target",
        description: "Body stats, activity & calorie target",
      },
      {
        id: "library",
        label: "My Food Library",
        icon: "mdi:food-apple",
        description: `Create & manage your custom foods (${foods.value.length})`,
      },
    ],
  },
  {
    id: "danger",
    title: "Danger Zone",
    danger: true,
    items: [
      {
        id: "reset",
        label: "Reset",
        icon: "mdi:alert-octagon",
        description: "Clear all logged foods",
        danger: true,
      },
    ],
  },
]);

const ACTIVITY_LABELS: Record<number, string> = {
  1.2: "Sedentary",
  1.375: "Light",
  1.55: "Moderate",
  1.725: "Active",
  1.9: "Very Active",
};

const GOAL_LABELS: Record<number, string> = {
  [-1100]: "Lose 1kg/wk",
  [-825]: "Lose 0.75kg/wk",
  [-550]: "Lose 0.5kg/wk",
  [-275]: "Lose 0.25kg/wk",
  [0]: "Maintain",
  [275]: "Gain 0.25kg/wk",
  [550]: "Gain 0.5kg/wk",
};

const weightLabel = computed(() => {
  if (bmr.value.weight === null) return "—";
  return `${bmr.value.weight}${bmr.value.unitSystem === "metric" ? "kg" : "lbs"}`;
});

const goalLabel = computed(() => GOAL_LABELS[bmr.value.target] ?? "—");

const activityLabel = computed(() => ACTIVITY_LABELS[bmr.value.activity] ?? "—");

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") emit("close");
};

onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("pointerup", commitDraft);
});
</script>

<template>
  <aside
    class="panel-gaming fixed top-16 right-0 bottom-0 z-40 flex w-full flex-col sm:w-96"
    role="dialog"
    aria-label="Settings panel"
  >
    <div
      aria-hidden="true"
      class="glow-edge-left pointer-events-none absolute inset-y-0 left-0 w-px bg-linear-to-b from-gaming-500/0 via-gaming-500/80 to-gaming-500/0"
    />

    <!-- Title bar -->
    <div
      class="flex shrink-0 items-center justify-between border-b border-gaming-700/30 bg-gaming-900/40 px-5 py-4"
    >
      <span class="section-header animate-settings-row text-lg font-black tracking-widest">
        <span class="shimmer-text">Settings</span>
      </span>
      <button
        class="rounded-lg p-2 text-gaming-400 transition-colors hover:bg-gaming-800/50 hover:text-white cursor-pointer"
        aria-label="Close settings"
        @click="emit('close')"
      >
        <Icon name="heroicons:x-mark" size="1.25rem" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-4 py-4">
      <!-- Player card -->
      <div
        class="stat-card animate-settings-row glass-light relative overflow-hidden rounded-2xl border border-gaming-700/30 p-4"
      >
        <div class="flex items-center gap-4">
          <div class="relative">
            <div
              class="glow-border flex h-14 w-14 items-center justify-center rounded-full border-2 border-gaming-500/60 bg-gaming-950/70"
            >
              <span class="font-orbitron text-xl font-black text-gaming-300 glow-text">
                {{ avatarLetter }}
              </span>
            </div>
            <span
              class="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-gaming-950 bg-hp-green"
            />
          </div>
          <div class="min-w-0 flex-1">
            <input
              v-model="playerName"
              type="text"
              maxlength="24"
              placeholder="PLAYER NAME"
              aria-label="Player name"
              class="input-gaming font-orbitron w-full border-b border-transparent bg-transparent pb-0.5 text-lg font-bold tracking-wide text-white transition-colors focus:border-gaming-500/60 focus:outline-none placeholder:text-white/25"
            />
            <div class="mt-1 flex items-center gap-1.5 text-xs font-mono text-white/50">
              <Icon name="mdi:heart-pulse" class="text-gaming-400" size="0.9rem" />
              <template v-if="bmr.bmr !== null">
                {{ bmr.bmr }} <span class="text-white/35">kcal/day</span>
              </template>
              <button
                v-else
                class="text-gaming-400 transition-colors hover:text-gaming-200 cursor-pointer"
                @click="emit('select', 'diet')"
              >
                TDEE not set — calibrate stats
              </button>
            </div>
          </div>
        </div>

        <!-- Stat chips -->
        <div class="mt-4 grid grid-cols-2 gap-2">
          <div class="rounded-xl border border-gaming-800/40 bg-gaming-950/50 px-3 py-2">
            <div class="text-[10px] font-semibold tracking-widest text-gaming-400 uppercase">
              TDEE
            </div>
            <div class="mt-0.5 font-mono text-sm font-black text-white">
              {{ bmr.bmr ?? "—"
              }}<span class="ml-1 text-[10px] font-normal text-white/40">kcal</span>
            </div>
          </div>
          <div class="rounded-xl border border-gaming-800/40 bg-gaming-950/50 px-3 py-2">
            <div class="text-[10px] font-semibold tracking-widest text-gaming-400 uppercase">
              Weight
            </div>
            <div class="mt-0.5 font-mono text-sm font-black text-white">
              {{ weightLabel }}
            </div>
          </div>
          <div class="rounded-xl border border-gaming-800/40 bg-gaming-950/50 px-3 py-2">
            <div class="text-[10px] font-semibold tracking-widest text-gaming-400 uppercase">
              Goal
            </div>
            <div class="mt-0.5 font-mono text-sm font-black text-white">
              {{ goalLabel }}
            </div>
          </div>
          <div class="rounded-xl border border-gaming-800/40 bg-gaming-950/50 px-3 py-2">
            <div class="text-[10px] font-semibold tracking-widest text-gaming-400 uppercase">
              Activity
            </div>
            <div class="mt-0.5 font-mono text-sm font-black text-white">
              {{ activityLabel }}
            </div>
          </div>
        </div>
      </div>

      <!-- Appearance -->
      <section class="mt-5">
        <div
          class="animate-settings-row mb-2 flex items-center gap-2 px-1"
          :style="{ animationDelay: '150ms' }"
        >
          <Icon name="mdi:palette" size="0.85rem" class="text-gaming-400" />
          <h3 class="text-[11px] font-black tracking-[0.2em] uppercase text-gaming-400">
            Appearance
          </h3>
          <div class="h-px flex-1 bg-gaming-700/30" />
        </div>

        <div
          class="animate-settings-row flex flex-wrap items-center gap-2 px-1"
          :style="{ animationDelay: '210ms' }"
          role="radiogroup"
          aria-label="Theme"
        >
          <button
            v-for="t in themes"
            :key="t.id"
            type="button"
            role="radio"
            :aria-checked="theme === t.id"
            :aria-label="`${t.label} theme`"
            :title="t.label"
            class="h-9 w-9 cursor-pointer rounded-full border-2 transition-all duration-200 hover:scale-110"
            :class="
              theme === t.id
                ? 'glow-border border-transparent scale-110'
                : 'border-white/15 hover:border-white/40'
            "
            :style="{ background: `linear-gradient(135deg, ${t.swatches.join(', ')})` }"
            @click="setTheme(t.id)"
          >
            <span class="sr-only">{{ t.label }}</span>
          </button>

          <!-- Custom accent: in-page UColorPicker so the commit can key off a
               real pointerup (release) instead of the native picker's close;
               committing also switches to the custom theme (useTheme.setAccent). -->
          <UPopover
            v-model:open="accentOpen"
            :content="{ side: 'bottom', sideOffset: 8 }"
            :ui="{ content: 'z-100' }"
          >
            <button
              type="button"
              class="relative h-9 w-9 cursor-pointer rounded-full border-2 transition-all duration-200 hover:scale-110"
              :class="
                theme === 'custom'
                  ? 'glow-border border-transparent scale-110'
                  : 'border-white/15 hover:border-white/40'
              "
              :style="{ background: accentOpen ? draftAccent : accent }"
              title="Custom color"
              aria-label="Custom accent color"
            >
              <Icon
                name="mdi:eyedropper"
                size="0.9rem"
                class="pointer-events-none absolute inset-0 m-auto text-white/80 drop-shadow"
              />
              <span class="sr-only">Custom color</span>
            </button>

            <template #content>
              <div
                class="rounded-xl border border-gaming-700/30 bg-gaming-950/95 p-2 shadow-lg backdrop-blur"
              >
                <UColorPicker v-model="draftAccent" size="md" :throttle="50" />
              </div>
            </template>
          </UPopover>
        </div>
      </section>

      <!-- Nav sections -->
      <section v-for="(section, sIdx) in sections" :key="section.id" class="mt-5">
        <div
          class="animate-settings-row mb-2 flex items-center gap-2 px-1"
          :style="{ animationDelay: `${150 + sIdx * 80}ms` }"
        >
          <Icon v-if="section.danger" name="mdi:alert" size="0.85rem" class="text-hp-red" />
          <h3
            class="text-[11px] font-black tracking-[0.2em] uppercase"
            :class="section.danger ? 'text-hp-red/80' : 'text-gaming-400'"
          >
            {{ section.title }}
          </h3>
          <div class="h-px flex-1" :class="section.danger ? 'bg-hp-red/20' : 'bg-gaming-700/30'" />
        </div>

        <button
          v-for="(item, iIdx) in section.items"
          :key="item.id"
          class="btn-gaming group animate-settings-row mb-2 flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition-all hover:scale-[1.01] hover:border-gaming-500/40 hover:bg-gaming-800/30"
          :class="
            item.danger
              ? 'border-hp-red/25 bg-hp-red/5 hover:border-hp-red/50 hover:bg-hp-red/10'
              : 'border-gaming-700/30 bg-gaming-950/40'
          "
          :style="{ animationDelay: `${180 + sIdx * 80 + iIdx * 60}ms` }"
          @click="emit('select', item.id)"
        >
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors"
            :class="
              item.danger
                ? 'border-hp-red/30 bg-hp-red/10 text-hp-red'
                : 'border-gaming-700/40 bg-gaming-900/40 text-gaming-300 group-hover:border-gaming-500/50 group-hover:text-gaming-200'
            "
          >
            <Icon :name="item.icon" size="1.25rem" />
          </span>
          <span class="min-w-0 flex-1 text-left">
            <span
              class="block text-sm font-bold tracking-wide"
              :class="item.danger ? 'text-hp-red' : 'text-white'"
            >
              {{ item.label }}
            </span>
            <span class="block truncate text-xs text-white/40">
              {{ item.description }}
            </span>
          </span>
          <Icon
            name="heroicons:chevron-right"
            size="1rem"
            class="shrink-0 text-white/30 transition-all group-hover:translate-x-0.5 group-hover:text-white/60"
          />
        </button>
      </section>
    </div>

    <!-- Footer -->
    <div class="shrink-0 border-t border-gaming-700/30 px-5 py-3 text-center">
      <span class="font-mono text-[10px] tracking-widest text-white/30 uppercase">
        MAXHP · data stored on this device
      </span>
    </div>
  </aside>
</template>
