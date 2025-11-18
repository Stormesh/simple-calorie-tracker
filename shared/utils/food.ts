export interface IFoodServing {
  serving_id: string;
  measurement_description: string;
  metric_serving_amount: number;
  metric_serving_unit: string;
  number_of_units: number;
  calories: number;
  carbohydrate: number;
  protein: number;
  fat: number;
  saturated_fat?: number;
  cholesterol?: number;
  sugar?: number;
  fiber?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  vitamin_a?: number;
  vitamin_c?: number;
  iron?: number;
}

export interface IFoodDetails {
  food_id: string;
  food_name: string;
  brand_name?: string;
  food_type: string;
  servings: {
    serving: IFoodServing[];
  };
}

interface IFatSecretSearchFood {
  food_id: string;
  food_name: string;
  food_description: string;
  food_type: string;
}

export interface IFatSecretSearchParams {
  food: IFatSecretSearchFood[];
  max_results: string;
  page_number: string;
  total_results: string;
}

export const searchFood = async (
  foodName: string
): Promise<IFatSecretSearchParams | null> => {
  if (!foodName.trim()) return null;

  try {
    const response = await $fetch<IFatSecretSearchParams>(
      `/api/nutrition/search/${encodeURIComponent(foodName)}`
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

export const getFood = async (foodId: string): Promise<IFoodDetails | null> => {
  if (!foodId.trim()) return null;

  try {
    const response = await $fetch<IFoodDetails>(
      `/api/nutrition/${encodeURIComponent(foodId)}`
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
