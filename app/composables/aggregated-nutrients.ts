export const useAggregatedNutrients = () => {
  const foodCookies = foodsList.map((meal) =>
    useCookie<IFoodTemplate[]>(`foods-${meal}`),
  );

  const aggregatedNutrients = computed(() => {
    const totals = {
      totalCalories: 0,
      totalFat: 0,
      saturatedFat: 0,
      cholesterol: 0,
      sodium: 0,
      totalCarbohydrate: 0,
      dietaryFiber: 0,
      sugars: 0,
      protein: 0,
    };

    foodCookies.forEach((cookie) => {
      if (cookie.value) {
        cookie.value.forEach((food) => {
          totals.totalCalories += food.calories;
          totals.totalFat += food.totalFat;
          totals.cholesterol += food.cholesterol;
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
