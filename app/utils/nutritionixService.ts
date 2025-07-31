// Define the API response interface
interface NutritionixResponse {
  foods: IFoodDetails[];
}

// API configuration
const API_BASE_URL = "https://trackapi.nutritionix.com/v2";

// Function to search for food nutrition data
export const searchFood = async (
  query: string
): Promise<IFoodDetails | null> => {
  const config = useRuntimeConfig()
  const API_KEY = String(config.public.NUXT_NUTRITIONIX_API_KEY || "");
  const APP_ID = String(config.public.NUXT_NUTRITIONIX_APP_ID || "");

  if (!API_KEY || !APP_ID) {
    console.error("API_KEY or APP_ID not found in environment variables");
    return null;
  }

  if (query.trim() === "") {
    return null;
  }

  isFoodLoading.value = true;

  let foodName: NutritionixResponse | null = null;
  try {
    foodName = await $fetch<NutritionixResponse>(
      `${API_BASE_URL}/natural/nutrients`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-id": APP_ID,
          "x-app-key": API_KEY,
        },
        body: {
          query: query,
        },
      }
    );
  } catch (error) {
    console.error("Error fetching nutrition data:", error);
    return null; // Crucial: return null on error
  } finally {
    isFoodLoading.value = false;
  }

  if (!foodName || !foodName.foods || foodName.foods.length === 0) {
    console.error("No food data found or error in response:", foodName);
    return null;
  }

  // Return the first food item if available
  return foodName.foods[0] ?? null;
};
