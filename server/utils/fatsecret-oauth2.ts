const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";

// Define the expected token response structure
interface FatSecretTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export const getAccessToken = async (
  clientId: string,
  clientSecret: string,
  scope: string = "basic"
): Promise<FatSecretTokenResponse> => {
  // 1. Combine Client ID and Secret into a Basic Auth string
  // Format: base64(client_id:client_secret)
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  try {
    // 2. Make the POST request to the token endpoint
    const response = await $fetch<FatSecretTokenResponse>(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${authString}`,
      },
      // 3. Use URLSearchParams for the POST body
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: scope,
      }).toString(),
    });

    // Response structure: { access_token: '...', token_type: 'Bearer', expires_in: 3600 }
    return response;
  } catch (error) {
    console.error("FatSecret OAuth 2.0 Token Error:", error);
    // Handle specific errors like 'invalid_client' (often due to wrong IP or credentials)
    throw new Error(
      "Failed to obtain FatSecret Access Token. Check IP Whitelist and Credentials."
    );
  }
};
