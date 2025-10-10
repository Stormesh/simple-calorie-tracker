const foodDetails = ref<IFoodDetails | null>(null);
const isFoodLoading = ref(false);

const isValidQuantity = computed(() => {
  if (!foodDetails.value) return false;
  const qty = foodDetails.value.serving_qty;
  const weight = foodDetails.value.serving_weight_grams;
  if (qty <= 1) return false;
  if (weight === null || weight === undefined) return true;
  // Check if qty is not "near" the weight. "Near" is defined as a difference of less than 10.
  return Math.abs(qty - weight) >= 10;
});

export const useFoodDetails = () => {
  return {
    foodDetails,
    isValidQuantity,
    isFoodLoading,
  };
};
