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

  const submitFood = async (
    food: ICommunitySubmitBody,
  ): Promise<ICommunitySubmitResponse | null> => {
    try {
      const result = await $fetch<ICommunitySubmitResponse>(`/api/community/submit`, {
        method: "POST",
        body: food,
      });
      return result;
    } catch (e) {
      console.error("Community submit failed:", e);
      return null;
    }
  };

  const flagFood = async (
    foodId: string,
    reason?: string,
  ): Promise<{ success: boolean; flags: number; hidden: boolean } | null> => {
    try {
      const result = await $fetch<{
        success: boolean;
        flags: number;
        hidden: boolean;
      }>(`/api/community/flag`, {
        method: "POST",
        body: { foodId, reason },
      });
      return result;
    } catch (e) {
      console.error("Community flag failed:", e);
      return null;
    }
  };

  return {
    searchCommunity,
    submitFood,
    flagFood,
  };
};
