export interface ICustomFoodServing {
  servingDescription: string;
  servingGrams: number;
  calories: number;
  totalFat: number;
  cholesterol: number;
  sodium: number;
  totalCarbohydrate: number;
  sugars: number;
  protein: number;
}

export interface ICustomFood {
  id: string;
  foodName: string;
  servings: ICustomFoodServing[];
  servingDescription?: string;
  servingGrams?: number;
  calories?: number;
  totalFat?: number;
  cholesterol?: number;
  sodium?: number;
  totalCarbohydrate?: number;
  sugars?: number;
  protein?: number;
  createdAt: string;
  submittedBy?: string;
}

export function getCustomFoodServings(food: ICustomFood): ICustomFoodServing[] {
  if (food.servings && food.servings.length > 0) {
    return food.servings;
  }
  return [{
    servingDescription: food.servingDescription || "100g",
    servingGrams: food.servingGrams || 100,
    calories: food.calories || 0,
    totalFat: food.totalFat || 0,
    cholesterol: food.cholesterol || 0,
    sodium: food.sodium || 0,
    totalCarbohydrate: food.totalCarbohydrate || 0,
    sugars: food.sugars || 0,
    protein: food.protein || 0,
  }];
}

export interface ICustomFoodCollection {
  version: number;
  exportedAt: string;
  foods: ICustomFood[];
}

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

interface IFoodSearchInfo {
  food_id: string;
  food_name: string;
  food_description: string;
  food_type: string;
}

export interface IFoodSearchResult {
  food: IFoodSearchInfo[];
  max_results: string;
  page_number: string;
  total_results: string;
}

export const searchFood = async (
  foodName: string,
): Promise<IFoodSearchResult | null> => {
  if (!foodName.trim()) return null;

  try {
    const response = await $fetch<IFoodSearchResult>(
      `/api/nutrition/search/${encodeURIComponent(foodName)}`,
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

export const getFood = async (
  foodId: string,
  amount?: number,
  unit?: string,
): Promise<IFoodDetails | null> => {
  if (!foodId.trim()) return null;

  try {
    const response = await $fetch<IFoodDetails>(
      `/api/nutrition/${encodeURIComponent(foodId)}`,
      {
        method: "POST",
        body: JSON.stringify({
          amount,
          unit,
        }),
      },
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
