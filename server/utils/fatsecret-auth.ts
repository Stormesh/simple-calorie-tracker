import { getAccessToken } from "./fatsecret-oauth2";

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getValidToken(apiKey: string, apiClientSecret: string): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const tokenData = await getAccessToken(apiKey, apiClientSecret);
  cachedToken = tokenData.access_token;
  tokenExpiresAt = Date.now() + tokenData.expires_in * 1000 - 5 * 60 * 1000;
  console.log("New FatSecret OAuth2 token acquired.");

  return cachedToken;
}
