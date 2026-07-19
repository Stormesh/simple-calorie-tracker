const FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api";

interface IFatSecretDetailResponse {
  food: IFoodDetails;
}

const cache = new FoodCache();

const parseNutrient = (value: string | number | undefined | null): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
};

const parseServings = (servings: {
  serving: IFoodServing | IFoodServing[];
}): {
  serving: IFoodServing[];
} => {
  const servingArray = Array.isArray(servings.serving)
    ? servings.serving
    : [servings.serving];

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
          newServing[key],
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
      return cachedFood.data as IFoodDetails;
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
        const token = await getValidToken(
          config.apiKey as string,
          config.apiClientSecret as string,
        );

        detailData = await $fetch<IFatSecretDetailResponse>(FATSECRET_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(
            Object.fromEntries(
              Object.entries(detailParams).map(([key, value]) => [
                key,
                String(value),
              ]),
            ),
          ).toString(),
        });
      } else {
        detailData = await fatsecretApiRequest<IFatSecretDetailResponse>(
          config.apiKey as string,
          config.apiSecret as string,
          detailParams,
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
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
);
