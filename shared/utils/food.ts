interface IFoodServing {
  serving_id: string;
  measurement_description: string;
  metric_serving_amount: string;
  metric_serving_unit: string;
  number_of_units: string;
  calories: string;
  carbohydrate: string;
  protein: string;
  fat: string;
  saturated_fat?: string;
  fiber?: string;
  sodium?: string;
  potassium?: string;
  calcium?: string;
  vitamin_a?: string;
  vitamin_c?: string;
  iron?: string;
}

export interface IFoodDetails {
  food_id: string;
  food_name: string;
  brand_name?: string;
  food_type: string;
  servings: {
    serving: IFoodServing | IFoodServing[];
  };
}

export const searchFood = async (
  foodName: string
): Promise<IFoodDetails | null> => {
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
