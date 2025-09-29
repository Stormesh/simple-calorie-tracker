export const foodsList = ["Breakfast", "Lunch", "Dinner", "Snacks"];

export const resetCookies = (cookieNames: string[]) => {
  cookieNames.forEach((cookieName) => {
    const cookie = useCookie(cookieName);
    cookie.value = null;
  });
  window.location.reload();
};

export interface IFoodDetails {
  food_name: string;
  serving_qty: number;
  serving_weight_grams: number;
  nf_calories: number;
  nf_total_fat: number;
  nf_cholesterol: number;
  nf_sodium: number;
  nf_total_carbohydrate: number;
  nf_sugars: number;
  nf_protein: number;
}

export const foodDetails = ref<IFoodDetails | null>(null);

export const isFoodLoading = ref(false);
