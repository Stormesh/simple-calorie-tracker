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
  photo: {
    thumb: string;
    highres: string | null;
    is_user_uploaded: boolean;
  }
}

export const searchFood = async (foodName: string): Promise<IFoodDetails | null> => {
  if (!foodName.trim()) return null;

  try {
    const response = await $fetch<IFoodDetails>(
      `/api/nutrition/${encodeURIComponent(foodName)}`
    );

    if (response && typeof response === "object" && "error" in response) {
      console.error("API Error:", response.error);
      return null;
    }

    return response;
  } catch (error) {
    console.error("Failed to fetch food data:", error);
    return null;
  }
};