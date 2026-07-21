<script setup lang="ts">
const emit = defineEmits<{ close: [boolean] }>();

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

const UNIT_SYSTEM_OPTIONS = [
  { label: "Metric (kg, cm)", value: "metric" },
  { label: "Imperial (lbs, inches)", value: "imperial" },
];

const ACTIVITY = [
  { label: "Sedentary", value: 1.2 },
  { label: "Light", value: 1.375 },
  { label: "Moderate", value: 1.55 },
  { label: "Active", value: 1.725 },
  { label: "Very Active", value: 1.9 },
];

const TARGET = [
  {
    metricLabel: "Lose 1kg a week",
    imperialLabel: "Lose 2lbs a week",
    value: -1100,
  },
  {
    metricLabel: "Lose 0.75kg a week",
    imperialLabel: "Lose 1.5lbs a week",
    value: -825,
  },
  {
    metricLabel: "Lose 0.5kg a week",
    imperialLabel: "Lose 1lb a week",
    value: -550,
  },
  {
    metricLabel: "Lose 0.25kg a week",
    imperialLabel: "Lose 0.5lb a week",
    value: -275,
  },
  {
    metricLabel: "Maintain current weight",
    imperialLabel: "Maintain current weight",
    value: 0,
  },
  {
    metricLabel: "Gain 0.25kg a week",
    imperialLabel: "Gain 0.5lb a week",
    value: 275,
  },
  {
    metricLabel: "Gain 0.5kg a week",
    imperialLabel: "Gain 1lb a week",
    value: 550,
  },
];

// Mifflin-St Jeor Equation Constants
const LBS_TO_KG_CONVERSION = 0.453592,
  INCHES_TO_CM_CONVERSION = 2.54,
  MALE_BMR_CONSTANT = 5,
  FEMALE_BMR_CONSTANT = -161,
  BMR_WEIGHT_MULTIPLIER = 10,
  BMR_HEIGHT_MULTIPLIER = 6.25,
  BMR_AGE_MULTIPLIER = 5;

const bmrForm = useBmr();

const targetOptions = computed(() => {
  return TARGET.map((target) => ({
    label: bmrForm.value.unitSystem === "metric" ? target.metricLabel : target.imperialLabel,
    value: target.value,
  }));
});

const calculateBMR = () => {
  if (!bmrForm.value.weight || !bmrForm.value.height || !bmrForm.value.age) {
    bmrForm.value.bmr = null;
    return;
  }

  let w = bmrForm.value.weight;
  let h = bmrForm.value.height;
  const a = bmrForm.value.age;

  // Convert to metric if imperial is selected for calculation
  if (bmrForm.value.unitSystem === "imperial") {
    w = w * LBS_TO_KG_CONVERSION; // lbs to kg
    h = h * INCHES_TO_CM_CONVERSION; // inches to cm
  }

  // Mifflin-St Jeor Equation
  const calculatedBMR =
    BMR_WEIGHT_MULTIPLIER * w +
    BMR_HEIGHT_MULTIPLIER * h -
    BMR_AGE_MULTIPLIER * a +
    (bmrForm.value.gender === "male" ? MALE_BMR_CONSTANT : FEMALE_BMR_CONSTANT);
  bmrForm.value.bmr = Math.round(calculatedBMR * bmrForm.value.activity + bmrForm.value.target);

  saveWeight(getTodayString(), bmrForm.value.weight);
};

const closeModal = () => {
  emit("close", false);
};
</script>

<template>
  <ModalTemplate title="Diet Profile">
    <UForm ref="form" :state="bmrForm" class="w-full" @submit.prevent="calculateBMR">
      <div class="flex flex-col gap-3 w-full">
        <div class="bg-gaming-950/40 rounded-xl p-3 border border-gaming-800/20">
          <h3 class="text-sm font-semibold text-gaming-400 mb-2 uppercase tracking-wider">
            Unit System
          </h3>
          <URadioGroup
            v-model="bmrForm.unitSystem"
            size="sm"
            :items="UNIT_SYSTEM_OPTIONS"
            class="text-white"
          />
        </div>

        <div class="bg-gaming-950/40 rounded-xl p-3 border border-gaming-800/20 space-y-2">
          <h3 class="text-sm font-semibold text-gaming-400 mb-2 uppercase tracking-wider">
            Body Stats
          </h3>
          <UInput
            v-model.number="bmrForm.weight"
            :placeholder="bmrForm.unitSystem === 'metric' ? 'Weight (kg)' : 'Weight (lbs)'"
            type="number"
            required
            size="md"
            step="0.1"
            class="w-full"
            :ui="{
              base: 'bg-gaming-950/80 border-gaming-700/30 text-white placeholder:text-white/30 rounded-lg input-gaming',
            }"
          />
          <UInput
            v-model.number="bmrForm.height"
            :placeholder="bmrForm.unitSystem === 'metric' ? 'Height (cm)' : 'Height (inches)'"
            type="number"
            required
            size="md"
            step="0.1"
            class="w-full"
            :ui="{
              base: 'bg-gaming-950/80 border-gaming-700/30 text-white placeholder:text-white/30 rounded-lg input-gaming',
            }"
          />
          <UInput
            v-model.number="bmrForm.age"
            placeholder="Age"
            type="number"
            required
            size="md"
            class="w-full"
            :ui="{
              base: 'bg-gaming-950/80 border-gaming-700/30 text-white placeholder:text-white/30 rounded-lg input-gaming',
            }"
          />
        </div>

        <div class="bg-gaming-950/40 rounded-xl p-3 border border-gaming-800/20">
          <h3 class="text-sm font-semibold text-gaming-400 mb-2 uppercase tracking-wider">
            Activity Level
          </h3>
          <USelect
            v-model="bmrForm.activity"
            size="md"
            :items="ACTIVITY"
            class="w-full"
            :ui="{
              base: 'bg-gaming-950/80 border-gaming-700/30 text-white rounded-lg',
            }"
          />
        </div>

        <div class="bg-gaming-950/40 rounded-xl p-3 border border-gaming-800/20">
          <h3 class="text-sm font-semibold text-gaming-400 mb-2 uppercase tracking-wider">
            Target
          </h3>
          <USelect
            v-model="bmrForm.target"
            size="md"
            :items="targetOptions"
            class="w-full"
            :ui="{
              base: 'bg-gaming-950/80 border-gaming-700/30 text-white rounded-lg',
            }"
          />
        </div>

        <div class="bg-gaming-950/40 rounded-xl p-3 border border-gaming-800/20">
          <h3 class="text-sm font-semibold text-gaming-400 mb-2 uppercase tracking-wider">
            Gender
          </h3>
          <URadioGroup
            v-model="bmrForm.gender"
            size="sm"
            :items="GENDER_OPTIONS"
            class="text-white"
          />
        </div>
      </div>

      <div class="flex justify-center gap-4 mt-6">
        <UButton
          icon="heroicons:calculator"
          label="Calculate"
          class="btn-gaming text-sm cursor-pointer bg-gaming-600 hover:bg-gaming-500 active:bg-gaming-400 text-white font-bold py-2 px-5 rounded-xl shadow-lg shadow-gaming-900/50 hover:shadow-gaming-500/30 transition-all border border-gaming-500/30"
          type="submit"
          @submit.prevent="calculateBMR"
        />
        <UButton
          icon="heroicons:x-mark"
          label="Cancel"
          class="btn-gaming text-sm cursor-pointer bg-gaming-950/60 hover:bg-hp-red/30 active:bg-hp-red/50 text-white font-bold py-2 px-5 rounded-xl border border-gaming-700/30 hover:border-hp-red/50 transition-all"
          @click="closeModal"
        />
      </div>

      <div v-if="bmrForm.bmr !== null" class="mt-4 text-center">
        <div class="inline-block bg-gaming-950/60 rounded-xl px-6 py-3 border border-gaming-700/30">
          <span class="text-xs text-gaming-400 uppercase tracking-wider block">Your TDEE</span>
          <span class="text-xl font-black text-gaming-400 glow-text"
            >{{ bmrForm.bmr }}
            <span class="text-sm font-normal text-white/60">calories/day</span></span
          >
        </div>
      </div>
    </UForm>
  </ModalTemplate>
</template>
