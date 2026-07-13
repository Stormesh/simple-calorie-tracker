export const useWeightChange = () => {
  const bmrState = useBmr();
  const { aggregatedNutrients } = useAggregatedNutrients();

  const weightChange = computed(() => {
    const tdee = bmrState.value.bmr || 0;
    const consumed = aggregatedNutrients.value.totalCalories;
    const deficit = tdee - consumed;

    return {
      deficit: Math.round(deficit),
      consumed: Math.round(consumed),
      tdee,
      isDeficit: deficit > 0,
      display:
        deficit > 0
          ? `Deficit: ${Math.round(deficit)} kcal`
          : deficit < 0
            ? `Surplus: ${Math.round(-deficit)} kcal`
            : "Maintenance",
    };
  });

  return { weightChange };
};
