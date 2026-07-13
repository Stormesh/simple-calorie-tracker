<script setup lang="ts">
import { CalendarDate } from "@internationalized/date";
import { formatLocalDate } from "~/composables/day-logs";

const dayLogs = useDayLogs();
const isPopoverOpen = ref(false);

const canGoNext = computed(() => {
  return dayLogs.currentDate.value < formatLocalDate(new Date());
});

const calendarDate = computed({
  get: () => {
    const d = new Date(dayLogs.currentDate.value + "T12:00:00");
    return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  },
  set: (val: CalendarDate) => {
    const mm = String(val.month).padStart(2, "0");
    const dd = String(val.day).padStart(2, "0");
    dayLogs.goToDate(`${val.year}-${mm}-${dd}`);
    isPopoverOpen.value = false;
  },
});

const todayMax = new CalendarDate(
  new Date().getFullYear(),
  new Date().getMonth() + 1,
  new Date().getDate(),
);

function openPopover() {
  isPopoverOpen.value = true;
}
</script>

<template>
  <div class="flex items-center justify-center gap-3 pt-3 pb-1 select-none">
    <UButton
      icon="heroicons:chevron-left"
      size="sm"
      color="neutral"
      variant="ghost"
      class="rounded-xl"
      aria-label="Previous day"
      @click="dayLogs.goPrev()"
    />

    <UPopover
      v-model:open="isPopoverOpen"
      :ui="{
        content:
          'bg-gaming-950/95 backdrop-blur-xl border border-gaming-700/30 rounded-xl shadow-2xl shadow-gaming-900/60 p-0',
      }"
    >
      <UButton
        color="neutral"
        variant="ghost"
        class="flex flex-col items-center px-4 py-1.5 rounded-xl min-w-[160px]"
        @click="openPopover"
      >
        <span class="text-sm font-bold text-white font-mono tracking-wide">
          {{ dayLogs.dateLabel }}
        </span>
        <span
          v-if="!dayLogs.isToday"
          class="text-[10px] text-gaming-400/60 uppercase tracking-widest"
        >
          Viewing history
        </span>
      </UButton>

      <template #content>
        <UCalendar
          v-model="calendarDate"
          :max-value="todayMax"
          color="primary"
          variant="solid"
          class="p-2"
        />
      </template>
    </UPopover>

    <UButton
      icon="heroicons:chevron-right"
      size="sm"
      color="neutral"
      variant="ghost"
      class="rounded-xl"
      :class="{ 'opacity-30 pointer-events-none': !canGoNext }"
      aria-label="Next day"
      :disabled="!canGoNext"
      @click="dayLogs.goNext()"
    />

    <UButton
      v-if="!dayLogs.isToday"
      label="Today"
      size="sm"
      color="neutral"
      variant="ghost"
      class="text-gaming-400 hover:text-gaming-300 text-xs rounded-lg"
      @click="dayLogs.goToday()"
    />
  </div>
</template>
