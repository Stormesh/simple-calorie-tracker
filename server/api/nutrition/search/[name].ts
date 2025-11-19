import { getAccessToken } from "~~/server/utils/fatsecret-oauth2";
import { fatsecretApiRequest } from "~~/server/utils/fatsecret-oauth1";

const FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api";

interface IFatSecretSearchResponse {
  foods: IFatSecretSearchParams;
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export default defineEventHandler(
  async (event): Promise<IFatSecretSearchParams | null> => {
    const search_expression = getRouterParam(event, "name");
    const config = useRuntimeConfig(event);

    if (!search_expression) {
      throw createError({
        statusCode: 400,
        statusMessage: "Search expression is required.",
      });
    }

    const useOAuth2 = !!config.apiClientSecret;

    let searchData: IFatSecretSearchResponse;

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

        const searchParams = {
          method: "foods.search",
          search_expression: search_expression,
          max_results: 10,
          page_number: 0,
          format: "json",
        };

        searchData = await $fetch<IFatSecretSearchResponse>(FATSECRET_API_URL, {
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
        });
      } else if (config.apiSecret) {
        console.log("Using FatSecret OAuth1.");
        const searchParams = {
          method: "foods.search",
          search_expression: search_expression,
          max_results: "10",
          page_number: "0",
          format: "json",
        };

        searchData = await fatsecretApiRequest<IFatSecretSearchResponse>(
          config.apiKey as string,
          config.apiSecret as string,
          searchParams
        );
      } else {
        throw createError({
          statusCode: 500,
          statusMessage: "FatSecret API credentials are not configured.",
        });
      }

      if (
        !searchData ||
        !searchData.foods ||
        searchData.foods.food.length === 0
      ) {
        console.log(
          `No foods found for search expression: ${search_expression}`
        );
        return null;
      }

      const foods = searchData.foods;
      return foods;
    } catch (error) {
      console.error("FatSecret API Request Error:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch data from FatSecret.",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
