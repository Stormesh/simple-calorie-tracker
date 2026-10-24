interface ICommunitySearchResult {
  foods: ICustomFood[];
  total: number;
  limit: number;
  offset: number;
}

interface ICommunitySubmitBody {
  foodName: string;
  servings?: ICustomFoodServing[];
  servingDescription?: string;
  servingGrams?: number;
  calories?: number;
  totalFat?: number;
  cholesterol?: number;
  sodium?: number;
  totalCarbohydrate?: number;
  sugars?: number;
  protein?: number;
  nickname?: string;
}

interface ICommunitySubmitResponse {
  success: boolean;
  id: string;
  remaining: number;
  message: string;
}

/** Shape of an error thrown by `$fetch` for a non-2xx response. */
interface ICommunityApiError {
  statusCode?: number;
  response?: { status?: number };
  data?: { data?: { retryAt?: number; foodName?: string } };
}

/**
 * Outcome of a community submission. Callers branch on `status` so a rate limit
 * reads as "wait a while" and a duplicate reads as "already there" instead of
 * both looking like a generic failure.
 */
export type CommunitySubmitResult =
  | { status: "shared"; message: string; remaining: number }
  | { status: "duplicate"; foodName: string }
  | { status: "rate-limited"; retryAt: number }
  | { status: "failed" };

/**
 * Outcome of flagging an entry. `already-flagged` is the durable one-vote-per
 * -reporter rule doing its job, not an error worth alarming the user about, and
 * `rate-limited` is the per-reporter quota on report volume.
 */
export type CommunityFlagResult =
  | { status: "flagged"; flags: number; hidden: boolean }
  | { status: "already-flagged" }
  | { status: "rate-limited"; retryAt: number }
  | { status: "failed" };

const errorStatus = (error: unknown): number | undefined => {
  const { response, statusCode } = error as ICommunityApiError;
  return response?.status ?? statusCode;
};

const errorRetryAt = (error: unknown): number => {
  const { data } = error as ICommunityApiError;
  return data?.data?.retryAt ?? 0;
};

const errorFoodName = (error: unknown): string => {
  const { data } = error as ICommunityApiError;
  return data?.data?.foodName ?? "";
};

export const useCommunityFoods = () => {
  const searchCommunity = async (query: string): Promise<ICustomFood[]> => {
    if (!query.trim()) return [];

    try {
      const data = await $fetch<ICommunitySearchResult>(
        `/api/community/search?q=${encodeURIComponent(query)}&limit=50`,
      );
      return data?.foods || [];
    } catch (e) {
      console.error("Community search failed:", e);
      return [];
    }
  };

  const submitFood = async (food: ICommunitySubmitBody): Promise<CommunitySubmitResult> => {
    try {
      const result = await $fetch<ICommunitySubmitResponse>(`/api/community/submit`, {
        method: "POST",
        body: food,
      });
      return { status: "shared", message: result.message, remaining: result.remaining };
    } catch (error) {
      const status = errorStatus(error);
      if (status === 409) {
        return { status: "duplicate", foodName: errorFoodName(error) };
      }
      if (status === 429) {
        return { status: "rate-limited", retryAt: errorRetryAt(error) };
      }
      console.error("Community submit failed:", error);
      return { status: "failed" };
    }
  };

  const flagFood = async (foodId: string, reason: string): Promise<CommunityFlagResult> => {
    try {
      const result = await $fetch<{
        success: boolean;
        flags: number;
        hidden: boolean;
      }>(`/api/community/flag`, {
        method: "POST",
        body: { foodId, reason },
      });
      return { status: "flagged", flags: result.flags, hidden: result.hidden };
    } catch (error) {
      const status = errorStatus(error);
      if (status === 409) {
        return { status: "already-flagged" };
      }
      if (status === 429) {
        return { status: "rate-limited", retryAt: errorRetryAt(error) };
      }
      console.error("Community flag failed:", error);
      return { status: "failed" };
    }
  };

  return {
    searchCommunity,
    submitFood,
    flagFood,
  };
};
