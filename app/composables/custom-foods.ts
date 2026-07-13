const STORAGE_KEY = "custom-foods";

export type ICustomFoodForm = Omit<ICustomFood, "id" | "createdAt">;

const generateId = (): string => {
  return `custom-${crypto.randomUUID()}`;
};

const migrateFood = (food: ICustomFood): ICustomFood => {
  if (food.servings && food.servings.length > 0) return food;
  return {
    ...food,
    servings: [
      {
        servingDescription: food.servingDescription || "100g",
        servingGrams: food.servingGrams || 100,
        calories: food.calories || 0,
        totalFat: food.totalFat || 0,
        cholesterol: food.cholesterol || 0,
        sodium: food.sodium || 0,
        totalCarbohydrate: food.totalCarbohydrate || 0,
        sugars: food.sugars || 0,
        protein: food.protein || 0,
      },
    ],
  };
};

export const useCustomFoods = () => {
  const foods = useLocalStorage<ICustomFood[]>(STORAGE_KEY, [], {
    serializer: {
      read: (raw) => JSON.parse(raw).map(migrateFood),
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

  const updateFood = (
    id: string,
    updates: Partial<Omit<ICustomFood, "id" | "createdAt">>,
  ) => {
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

      const existingNames = new Set(
        foods.value.map((f) => f.foodName.toLowerCase()),
      );

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
      result.errors.push(
        `Parse error: ${e instanceof Error ? e.message : String(e)}`,
      );
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
