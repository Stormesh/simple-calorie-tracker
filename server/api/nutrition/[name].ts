// server/api/fatsecret/search.ts
import { getAccessToken } from "~~/server/utils/fatsecret-oauth2";

const FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api";

// Define interfaces for FatSecret API responses
interface FatSecretFood {
  food_id: string;
  food_name: string;
  brand_name?: string;
  food_type: string;
  servings: {
    serving: FatSecretServing | FatSecretServing[];
  };
}

interface FatSecretServing {
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

interface FatSecretSearchResponse {
  foods: {
    food: FatSecretFood[];
  };
}

interface FatSecretDetailResponse {
  food: FatSecretFood;
}

// TODO: Implement a simple token caching mechanism here for production use
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export default defineEventHandler(async (event) => {
  const search_expression = getRouterParam(event, "name");
  const config = useRuntimeConfig(event);

  // 1. Get Access Token (or refresh if expired)
  if (!cachedToken || Date.now() >= tokenExpiresAt) {
    const tokenData = await getAccessToken(
      config.apiKey as string, // Client ID
      config.apiSecret as string // Client Secret
    );
    cachedToken = tokenData.access_token;
    // Set expiry to a few minutes before actual expiry time for safety
    tokenExpiresAt = Date.now() + tokenData.expires_in * 1000 - 5 * 60 * 1000;
    console.log("New FatSecret token acquired.");
  }

  // 2. First API call: foods.search to get food items
  const searchParams = {
    method: "foods.search",
    search_expression: search_expression,
    max_results: 10,
    page_number: 0,
    format: "json",
  };

  try {
    // First API call to search for foods
    const searchData = await $fetch<FatSecretSearchResponse>(
      FATSECRET_API_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cachedToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(
          Object.fromEntries(
            Object.entries(searchParams).map(([key, value]) => [
              key,
              String(value),
            ])
          )
        ).toString(),
      }
    );

    // Check if search results exist and have food entries
    if (
      !searchData ||
      !searchData.foods ||
      searchData.foods.food.length === 0
    ) {
      console.log(`No foods found for search expression: ${search_expression}`);
      return { foods: [] };
    }

    // Extract the food_id of the first food item
    const firstFood = searchData.foods.food[0];
    const foodId = firstFood.food_id;

    // 3. Second API call: food.get.v2 to get detailed nutritional information
    const detailParams = {
      method: "food.get.v2",
      food_id: foodId,
      format: "json",
    };

    const detailData = await $fetch<FatSecretDetailResponse>(
      FATSECRET_API_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cachedToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(
          Object.fromEntries(
            Object.entries(detailParams).map(([key, value]) => [
              key,
              String(value),
            ])
          )
        ).toString(),
      }
    );

    // Return the detailed nutritional information
    return detailData;
  } catch (error) {
    console.error("FatSecret API Request Error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch data from FatSecret.",
    });
  }
});
