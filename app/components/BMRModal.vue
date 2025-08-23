<script setup lang="ts">
const emit = defineEmits<{ close: [boolean] }>();
const form = ref();

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

const UNIT_SYSTEM_OPTIONS = [
  { label: "Metric (kg, cm)", value: "metric" },
  { label: "Imperial (lbs, inches)", value: "imperial" },
];

// Mifflin-St Jeor Equation Constants
const LBS_TO_KG_CONVERSION = 0.453592;
const INCHES_TO_CM_CONVERSION = 2.54;
const MALE_BMR_CONSTANT = 5;
const FEMALE_BMR_CONSTANT = -161;
const BMR_WEIGHT_MULTIPLIER = 10;
const BMR_HEIGHT_MULTIPLIER = 6.25;
const BMR_AGE_MULTIPLIER = 5;

const bmrForm = useBmr();

const calculateBMR = () => {
  if (
    bmrForm.value.weight === null ||
    bmrForm.value.height === null ||
    bmrForm.value.age === null
  ) {
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
  bmrForm.value.bmr = Math.round(calculatedBMR);
};

const closeModal = () => {
  emit("close", false);
};
</script>

<template>
  <ModalTemplate title="Calculate Your BMR">
    <UForm
      ref="form"
      :state="bmrForm"
      class="p-4 space-y-4"
      @submit.prevent="calculateBMR"
    >
      <div class="flex justify-center items-center flex-col gap-2">
        <URadioGroup
          v-model="bmrForm.unitSystem"
          legend="Unit System"
          size="xl"
          :items="UNIT_SYSTEM_OPTIONS"
          class="mb-4"
        />
        <UInput
          v-model.number="bmrForm.weight"
          :placeholder="
            bmrForm.unitSystem === 'metric' ? 'Weight (kg)' : 'Weight (lbs)'
          "
          type="number"
          size="xl"
          step="0.1"
          class="w-full"
        />
        <UInput
          v-model.number="bmrForm.height"
          :placeholder="
            bmrForm.unitSystem === 'metric' ? 'Height (cm)' : 'Height (inches)'
          "
          type="number"
          size="xl"
          step="0.1"
          class="w-full"
        />
        <UInput
          v-model.number="bmrForm.age"
          placeholder="Age"
          type="number"
          size="xl"
          class="w-full"
        />
        <URadioGroup
          v-model="bmrForm.gender"
          legend="Gender"
          size="xl"
          :items="GENDER_OPTIONS"
          class="mt-4"
        />
      </div>

      <div class="flex justify-center gap-4 mt-6">
        <UButton
          icon="heroicons:calculator"
          label="Calculate"
          class="text-lg cursor-pointer bg-slate-600 dark:bg-sky-700 hover:bg-teal-600 active:bg-teal-500 text-white font-bold py-2 px-4 rounded-lg"
          type="submit"
          @submit.prevent="calculateBMR"
        />
        <UButton
          icon="heroicons:x-mark"
          label="Cancel"
          class="text-lg cursor-pointer bg-slate-600 dark:bg-sky-700 hover:bg-rose-700 active:bg-rose-600 text-white font-bold py-2 px-4 rounded-lg"
          @click="closeModal"
        />
      </div>

      <div
        v-if="bmrForm.bmr !== null"
        class="mt-4 text-center text-xl font-semibold"
      >
        Your BMR: {{ bmrForm.bmr }} calories/day
      </div>
    </UForm>
  </ModalTemplate>
</template>
