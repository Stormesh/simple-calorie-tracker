import { getAccessToken } from "~~/server/utils/fatsecret-oauth2";
import type { IFoodDetails, IFoodServing } from "~~/shared/utils/food";

const FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api";

interface FatSecretSearchResponse {
  foods: {
    food: IFoodDetails[];
  };
}

interface FatSecretDetailResponse {
  food: IFoodDetails;
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

const parseNutrient = (value: string | number | undefined | null): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
};

const parseServings = (servings: {
  serving: IFoodServing[];
}): {
  serving: IFoodServing[];
} => {
  const servingArray = servings.serving;

  const nutrientKeys: (keyof IFoodServing)[] = [
    "number_of_units",
    "metric_serving_amount",
    "calories",
    "carbohydrate",
    "protein",
    "fat",
    "saturated_fat",
    "cholesterol",
    "sugar",
    "fiber",
    "sodium",
    "potassium",
    "calcium",
    "vitamin_a",
    "vitamin_c",
    "iron",
  ];

  const parsedServings = servingArray.map((serving) => {
    const newServing = { ...serving };
    for (const key of nutrientKeys) {
      if (key in newServing) {
        (newServing as Record<string, string | number>)[key] = parseNutrient(
          newServing[key]
        );
      }
    }
    return newServing as IFoodServing;
  });

  return { serving: parsedServings };
};

export default defineEventHandler(async (event) => {
  const search_expression = getRouterParam(event, "name");
  const config = useRuntimeConfig(event);

  if (!cachedToken || Date.now() >= tokenExpiresAt) {
    const tokenData = await getAccessToken(
      config.apiKey as string,
      config.apiSecret as string
    );
    cachedToken = tokenData.access_token;
    tokenExpiresAt = Date.now() + tokenData.expires_in * 1000 - 5 * 60 * 1000;
    console.log("New FatSecret token acquired.");
  }

  const searchParams = {
    method: "foods.search",
    search_expression: search_expression,
    max_results: 10,
    page_number: 0,
    format: "json",
  };

  try {
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

    if (
      !searchData ||
      !searchData.foods ||
      searchData.foods.food.length === 0
    ) {
      console.log(`No foods found for search expression: ${search_expression}`);
      return { foods: [] };
    }

    const firstFood = searchData.foods.food[0];
    const foodId = firstFood.food_id;

    const detailParams = {
      method: "food.get",
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

    const food = detailData.food;
    if (food.servings) {
      food.servings = parseServings(food.servings);
    }

    return food;
  } catch (error) {
    console.error("FatSecret API Request Error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch data from FatSecret.",
    });
  }
});
