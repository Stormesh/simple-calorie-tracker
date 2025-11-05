interface NutritionixResponse {
  foods: IFoodDetails[];
}

// API configuration
const API_BASE_URL = "https://trackapi.nutritionix.com/v2";

// Cache configuration
const cache = new Map<string, IFoodDetails>();

export default defineEventHandler(async (event) => {
  // Get query parameters correctly
  const query = getRouterParam(event, "name");
  
  const config = useRuntimeConfig();
  const apiKey = config.apiKey || "";
  const appId = config.appId || "";

  if (!apiKey || !appId) {
    console.error("API_KEY or APP_ID not found in environment variables");
    return { error: "API configuration missing" };
  }

  if (!query || query.trim() === "") {
    return { error: "No query provided" };
  }

  // Check cache first
  if (cache.has(query)) {
    return cache.get(query) ?? null;
  }

  let foodName: NutritionixResponse | null = null;
  try {
    foodName = await $fetch<NutritionixResponse>(
      `${API_BASE_URL}/natural/nutrients`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-id": appId,
          "x-app-key": apiKey,
        },
        body: {
          query: query,
        },
      }
    );
  } catch (error) {
    console.error("Error fetching nutrition data:", error);
    return { error: "Failed to fetch nutrition data" }; // Crucial: return error on failure
  }

  if (!foodName || !foodName.foods || foodName.foods.length === 0) {
    console.error("No food data found or error in response:", foodName);
    return { error: "No food data found" };
  }

  const foodData = foodName.foods[0];

  // Store in cache
  if (foodData) {
    cache.set(query, foodData);
  }

  // Return the first food item if available
  return foodData;
});