const STORAGE_KEY = "custom-foods";

export type ICustomFoodForm = Omit<ICustomFood, "id" | "createdAt">;

const generateId = (): string => {
  return `custom-${crypto.randomUUID()}`;
};

const migrateFood = (food: ICustomFood): ICustomFood => ({
  ...food,
  servings: getCustomFoodServings(food),
});

// localStorage is untrusted: older builds, partial writes, or another tab can
// leave it empty or corrupt. This must never throw — a broken read would leave
// the foods ref permanently unset and the library unusable. Exported for tests.
export const deserializeCustomFoods = (raw: string | null): ICustomFood[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): ICustomFood[] => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      return [migrateFood(item as ICustomFood)];
    });
  } catch (e) {
    console.error("Failed to parse stored custom foods, starting empty:", e);
    return [];
  }
};

export const useCustomFoods = () => {
  const foods = useLocalStorage<ICustomFood[]>(STORAGE_KEY, [], {
    serializer: {
      read: deserializeCustomFoods,
      write: (value) => JSON.stringify(value),
    },
  });

  const addFood = (food: Omit<ICustomFood, "id" | "createdAt">) => {
    const newFood: ICustomFood = {
      ...food,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    foods.value.push(newFood);
    return newFood;
  };

  const updateFood = (id: string, updates: Partial<Omit<ICustomFood, "id" | "createdAt">>) => {
    const index = foods.value.findIndex((f) => f.id === id);
    if (index === -1) return false;
    foods.value[index] = { ...foods.value[index], ...updates } as ICustomFood;
    return true;
  };

  const deleteFood = (id: string) => {
    const index = foods.value.findIndex((f) => f.id === id);
    if (index === -1) return false;
    foods.value.splice(index, 1);
    return true;
  };

  const searchFoods = (query: string): ICustomFood[] => {
    if (!query.trim()) return foods.value;
    const q = query.toLowerCase();
    return foods.value.filter((f) => f.foodName.toLowerCase().includes(q));
  };

  const exportToJson = (): string => {
    const collection: ICustomFoodCollection = {
      version: 1,
      exportedAt: new Date().toISOString(),
      foods: foods.value,
    };
    return JSON.stringify(collection, null, 2);
  };

  const importFromJson = (
    json: string,
  ): { imported: number; skipped: number; errors: string[] } => {
    const result = { imported: 0, skipped: 0, errors: [] as string[] };
    try {
      const collection = JSON.parse(json) as ICustomFoodCollection;
      if (!collection.version || !Array.isArray(collection.foods)) {
        result.errors.push("Invalid file format");
        return result;
      }

      const existingNames = new Set(foods.value.map((f) => f.foodName.toLowerCase()));

      for (const food of collection.foods) {
        if (!food.foodName || food.calories === undefined) {
          result.errors.push(`Skipped invalid entry: ${JSON.stringify(food)}`);
          continue;
        }

        if (existingNames.has(food.foodName.toLowerCase())) {
          result.skipped++;
          continue;
        }

        foods.value.push(
          migrateFood({
            ...food,
            id: generateId(),
            createdAt: new Date().toISOString(),
          }),
        );
        existingNames.add(food.foodName.toLowerCase());
        result.imported++;
      }
    } catch (e) {
      result.errors.push(`Parse error: ${e instanceof Error ? e.message : String(e)}`);
    }
    return result;
  };

  const getFoodById = (id: string): ICustomFood | undefined => {
    return foods.value.find((f) => f.id === id);
  };

  return {
    foods,
    addFood,
    updateFood,
    deleteFood,
    searchFoods,
    exportToJson,
    importFromJson,
    getFoodById,
  };
};
