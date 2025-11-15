import { getAccessToken } from "~~/server/utils/fatsecret-oauth2";
import { fatsecretApiRequest } from "~~/server/utils/fatsecret-oauth1";
import type { IFoodDetails, IFoodServing } from "~~/shared/utils/food";

const FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api";

interface IFatSecretDetailResponse {
  food: IFoodDetails;
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

const cache = new FoodCache();

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

export default defineEventHandler(
  async (event): Promise<IFoodDetails | null> => {
    const search_expression = getRouterParam(event, "id");
    const config = useRuntimeConfig(event);

    if (!search_expression) {
      throw createError({
        statusCode: 400,
        statusMessage: "Search expression is required.",
      });
    }

    const cachedFood = cache.get(search_expression);
    if (cachedFood) {
      return cachedFood.data;
    }

    const useOAuth2 = !!config.apiClientSecret;

    let detailData: IFatSecretDetailResponse;

    const detailParams = {
      method: "food.get",
      food_id: search_expression,
      format: "json",
    };

    try {
      if (useOAuth2) {
        if (!cachedToken || Date.now() >= tokenExpiresAt) {
          const tokenData = await getAccessToken(
            config.apiKey as string,
            config.apiClientSecret as string
          );
          cachedToken = tokenData.access_token;
          tokenExpiresAt =
            Date.now() + tokenData.expires_in * 1000 - 5 * 60 * 1000;
          console.log("New FatSecret OAuth2 token acquired.");
        }

        detailData = await $fetch<IFatSecretDetailResponse>(FATSECRET_API_URL, {
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
        });
      } else {
        detailData = await fatsecretApiRequest<IFatSecretDetailResponse>(
          config.apiKey as string,
          config.apiSecret as string,
          detailParams
        );
      }

      const food = detailData.food;
      if (food.servings) {
        food.servings = parseServings(food.servings);
      }

      cache.set(search_expression, food);

      return food;
    } catch (error) {
      console.error("FatSecret API Request Error:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch data from FatSecret.",
      });
    }
  }
);
