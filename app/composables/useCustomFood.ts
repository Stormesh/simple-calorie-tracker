import { useStorage } from "@vueuse/core";

import CustomFoodModal from "~/components/CustomFoodModal.vue";

export interface ICustomFood {
  foodName: string;
  calories: number;
}

export const useCustomFood = () => {
  const customFoods = useStorage<ICustomFood[]>("custom-foods", () => []);

  const customFoodModal = overlay.create(CustomFoodModal);

  const showCustomFoodModal = () => {
    customFoodModal.open();
  };

  const verifyCustomFood = (food: ICustomFood) => {
    return food.foodName.trim() && food.calories > 0;
  };

  const customFoodExists = (food: ICustomFood) => {
    return customFoods.value.some((f) => f.foodName === food.foodName);
  };

  const addCustomFood = (food: ICustomFood) => {
    if (!verifyCustomFood(food) || customFoodExists(food)) return;
    customFoods.value.push(food);
  };

  const removeCustomFood = (index: number) => {
    customFoods.value.splice(index, 1);
  };

  return {
    customFoods,
    showCustomFoodModal,
    addCustomFood,
    removeCustomFood,
    verifyCustomFood,
  };
};
