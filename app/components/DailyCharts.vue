<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "vue-chartjs";
import type { ChartData } from "chart.js";

ChartJS.register(
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const dayLogs = useDayLogs();
const bmrState = useBmr();
const { aggregatedNutrients } = useAggregatedNutrients();

const CHART_DAYS = 14;

interface IDailyTotals {
  calories: number;
  fat: number;
  protein: number;
  carbs: number;
}

interface IChartDataset {
  label: string;
  data: (number | null)[];
  backgroundColor?:
    | string
    | string[]
    | CanvasGradient
    | ((ctx: { chart: { ctx: CanvasRenderingContext2D } }) => string | CanvasGradient);
  borderColor?: string | string[];
  borderWidth?: number;
  borderRadius?: number;
  barPercentage?: number;
  pointRadius?: number;
  pointHitRadius?: number;
  pointBackgroundColor?: string;
  pointBorderColor?: string;
  pointBorderWidth?: number;
  tension?: number;
  fill?: boolean;
  spanGaps?: boolean;
}

interface IChartData {
  labels: string[];
  datasets: IChartDataset[];
}

function getDailyTotals(date: string, logs: IDayLog[]): IDailyTotals {
  const log = logs.find((l) => l.date === date);
  if (!log) return { calories: 0, fat: 0, protein: 0, carbs: 0 };

  let calories = 0,
    fat = 0,
    protein = 0,
    carbs = 0;
  const mealKeys = Object.keys(log.foods);
  for (const key of mealKeys) {
    const foods = log.foods[key] || [];
    for (const f of foods) {
      calories += f.calories || 0;
      fat += f.totalFat || 0;
      protein += f.protein || 0;
      carbs += f.totalCarbohydrate || 0;
    }
  }

  return { calories, fat, protein, carbs };
}

function getShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const caloriesChartData = ref<IChartData>({ labels: [], datasets: [] });
const weightChartData = ref<IChartData>({ labels: [], datasets: [] });
const macroChartData = ref<IChartData>({ labels: [], datasets: [] });

const hasData = ref(false);
const hasWeightData = ref(false);

function loadChartData() {
  const allLogs = getAllDayLogs();
  const target = bmrState.value.bmr || 2000;

  const today = new Date();
  const labels: string[] = [];
  const dayTotals: IDailyTotals[] = [];

  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatLocalDate(d);
    labels.push(getShortDate(dateStr));
    dayTotals.push(getDailyTotals(dateStr, allLogs));
  }

  // --- Weight Log ---
  const weightValues: (number | null)[] = [];
  let hasWeight = false;

  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatLocalDate(d);
    const log = allLogs.find((l) => l.date === dateStr);
    const w = log?.weightLog ?? null;
    if (w !== null) hasWeight = true;
    weightValues.push(w);
  }

  hasData.value = dayTotals.some((t) => t.calories > 0) || hasWeight;
  hasWeightData.value = hasWeight;

  const weightUnit = bmrState.value.unitSystem === "imperial" ? "lbs" : "kg";

  weightChartData.value = {
    labels,
    datasets: [
      {
        label: `Weight (${weightUnit})`,
        data: weightValues,
        borderColor: "#a78bfa",
        backgroundColor: (ctx: { chart: { ctx: CanvasRenderingContext2D } }) => {
          const canvas = ctx.chart.ctx;
          const gradient = canvas.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(167, 139, 250, 0.25)");
          gradient.addColorStop(1, "rgba(167, 139, 250, 0.01)");
          return gradient;
        },
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#a78bfa",
        pointBorderColor: "#fff",
        pointBorderWidth: 1,
        borderWidth: 2,
        spanGaps: false,
      },
    ],
  };

  // --- Calories vs Target ---
  const caloriesData = dayTotals.map((t) => t.calories);
  const targetData = dayTotals.map(() => target);
  const bgColors = dayTotals.map((t) =>
    t.calories > target ? "rgba(239, 68, 68, 0.8)" : "rgba(34, 197, 94, 0.8)",
  );
  const borderColors = dayTotals.map((t) =>
    t.calories > target ? "rgb(239, 68, 68)" : "rgb(34, 197, 94)",
  );

  caloriesChartData.value = {
    labels,
    datasets: [
      {
        label: "Calories",
        data: caloriesData,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 3,
        barPercentage: 0.7,
      },
      {
        label: "Target",
        type: "line" as const,
        data: targetData,
        borderColor: "#fbbf24",
        borderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 10,
        tension: 0,
        fill: false,
      } as IChartDataset,
    ],
  };

  // --- Macro Breakdown ---
  macroChartData.value = {
    labels,
    datasets: [
      {
        label: "Fat",
        data: dayTotals.map((t) => Number(t.fat.toFixed(1))),
        backgroundColor: "rgba(239, 68, 68, 0.8)",
      },
      {
        label: "Protein",
        data: dayTotals.map((t) => Number(t.protein.toFixed(1))),
        backgroundColor: "rgba(59, 130, 246, 0.8)",
      },
      {
        label: "Carbs",
        data: dayTotals.map((t) => Number(t.carbs.toFixed(1))),
        backgroundColor: "rgba(251, 191, 36, 0.8)",
      },
    ],
  };
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: "#ffffff99",
        font: { family: "'JetBrains Mono', monospace", size: 11 },
        boxWidth: 12,
        padding: 12,
      },
    },
    tooltip: {
      backgroundColor: "rgba(15, 10, 20, 0.95)",
      titleFont: { family: "'JetBrains Mono', monospace" },
      bodyFont: { family: "'JetBrains Mono', monospace" },
      borderColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: {
        color: "#ffffff55",
        font: { size: 10, family: "'JetBrains Mono', monospace" },
        maxRotation: 45,
      },
      grid: { color: "#ffffff08" },
    },
    y: {
      ticks: {
        color: "#ffffff55",
        font: { size: 10, family: "'JetBrains Mono', monospace" },
      },
      grid: { color: "#ffffff08" },
    },
  },
};

const stackedOptions = {
  ...chartOptions,
  scales: {
    ...chartOptions.scales,
    x: {
      ...chartOptions.scales.x,
      stacked: true,
    },
    y: {
      ...chartOptions.scales.y,
      stacked: true,
    },
  },
};

const mixedCaloriesData = computed(() => caloriesChartData.value as ChartData<"bar">);
const weightAsLine = computed(() => weightChartData.value as ChartData<"line">);
const macroAsBar = computed(() => macroChartData.value as ChartData<"bar">);

const weightUnitLabel = computed(() => (bmrState.value.unitSystem === "imperial" ? "lbs" : "kg"));

const weightOptions = computed(() => ({
  ...chartOptions,
  scales: {
    ...chartOptions.scales,
    y: {
      ...chartOptions.scales.y,
      ticks: {
        ...chartOptions.scales.y.ticks,
        callback: (tickValue: string | number) => `${tickValue} ${weightUnitLabel.value}`,
      },
    },
  },
}));

const caloriesOptions = {
  ...chartOptions,
  scales: {
    ...chartOptions.scales,
    y: {
      ...chartOptions.scales.y,
      ticks: {
        ...chartOptions.scales.y.ticks,
        callback: (tickValue: string | number) => `${tickValue} kcal`,
      },
    },
  },
};

onMounted(() => {
  onWeightChange(loadChartData);
});

watch(
  [aggregatedNutrients, () => bmrState.value.bmr, () => dayLogs.currentDate.value],
  loadChartData,
  { deep: true, immediate: true },
);
</script>

<template>
  <div class="flex justify-center items-center mt-8 mb-4">
    <div
      class="w-full max-w-4xl p-6 glass-light rounded-2xl shadow-lg shadow-gaming-900/30 border border-gaming-700/20"
    >
      <div class="text-center mb-6">
        <span class="section-header text-sm font-black text-gaming-400 tracking-[0.2em]"
          >DAILY ANALYTICS</span
        >
      </div>

      <div v-if="!hasData" class="py-12 text-center">
        <Icon name="mdi:chart-line" size="3rem" class="text-white/20 mx-auto mb-3" />
        <p class="text-white/40 text-sm font-mono">Start logging food to see your trends</p>
      </div>

      <div v-else class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gaming-950/40 rounded-xl p-4 border border-gaming-800/20">
            <h3
              class="text-xs font-semibold text-gaming-400 uppercase tracking-widest mb-3 text-center"
            >
              Weight Log
            </h3>
            <div v-if="!hasWeightData" class="h-56 flex items-center justify-center">
              <p class="text-white/30 text-xs font-mono">
                Update your weight in the Diet Profile to see it here
              </p>
            </div>
            <div v-else class="h-56">
              <ClientOnly>
                <Line :data="weightAsLine" :options="weightOptions" />
              </ClientOnly>
            </div>
          </div>

          <div class="bg-gaming-950/40 rounded-xl p-4 border border-gaming-800/20">
            <h3
              class="text-xs font-semibold text-gaming-400 uppercase tracking-widest mb-3 text-center"
            >
              Calories vs Target
            </h3>
            <div class="h-56">
              <ClientOnly>
                <Bar :data="mixedCaloriesData" :options="caloriesOptions" />
              </ClientOnly>
            </div>
          </div>
        </div>

        <div class="bg-gaming-950/40 rounded-xl p-4 border border-gaming-800/20">
          <h3
            class="text-xs font-semibold text-gaming-400 uppercase tracking-widest mb-3 text-center"
          >
            Macronutrient History
          </h3>
          <div class="h-56">
            <ClientOnly>
              <Bar :data="macroAsBar" :options="stackedOptions" />
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
