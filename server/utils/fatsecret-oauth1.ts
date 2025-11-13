import { createHmac } from "crypto";

const API_URL = "https://platform.fatsecret.com/rest/server.api";

const generateNonce = (length: number): string => {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getTimestamp = (): string => {
  return Math.floor(new Date().getTime() / 1000).toString();
};

const generateSignature = (
  httpMethod: string,
  baseUrl: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ""
): string => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    )
    .join("&");

  const signatureBaseString = [
    httpMethod.toUpperCase(),
    encodeURIComponent(baseUrl),
    encodeURIComponent(sortedParams),
  ].join("&");

  const signingKey = `${encodeURIComponent(
    consumerSecret
  )}&${encodeURIComponent(tokenSecret)}`;

  const signature = createHmac("sha1", signingKey)
    .update(signatureBaseString)
    .digest("base64");

  return signature;
};

export const fatsecretApiRequest = async <T = unknown>(
  consumerKey: string,
  consumerSecret: string,
  params: Record<string, string>
): Promise<T> => {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(32),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: getTimestamp(),
    oauth_version: "1.0",
    ...params,
  };

  const signature = generateSignature(
    "POST",
    API_URL,
    oauthParams,
    consumerSecret
  );

  const authHeaderParams: Record<string, string> = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const authHeader =
    "OAuth " +
    Object.keys(authHeaderParams)
      .map(
        (key) =>
          `${encodeURIComponent(key)}="${encodeURIComponent(
            authHeaderParams[key]
          )}"`
      )
      .join(", ");

  try {
    const response = await $fetch<T>(API_URL, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(oauthParams).toString(),
    });
    return response as T;
  } catch (error) {
    console.error("FatSecret OAuth 1.0a Request Error:", error);
    throw new Error("Failed to make FatSecret API request.");
  }
};
