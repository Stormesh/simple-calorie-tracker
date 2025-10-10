export interface ITotalNutrients {
  totalCalories: number;
  totalFat: number;
  sodium: number;
  totalCarbohydrate: number;
  sugars: number;
  protein: number;
}

export const useAggregatedNutrients = () => {
  const aggregatedNutrients = computed(() => {
    const totals = {
      totalCalories: 0,
      totalFat: 0,
      sodium: 0,
      totalCarbohydrate: 0,
      sugars: 0,
      protein: 0,
    };

    foodsList.forEach((listName) => {
      const foodsCookie = useCookie<IFoodTemplate[]>(`foods-${listName}`);
      if (foodsCookie.value) {
        foodsCookie.value.forEach((food) => {
          totals.totalCalories += food.calories;
          totals.totalFat += food.totalFat;
          totals.sodium += food.sodium;
          totals.totalCarbohydrate += food.totalCarbohydrate;
          totals.sugars += food.sugars;
          totals.protein += food.protein;
        });
      }
    });
    return totals;
  });

  return {
    aggregatedNutrients,
  };
};
