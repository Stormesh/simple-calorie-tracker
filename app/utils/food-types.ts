export interface IFoodTemplate {
  foodName: string;
  foodId: string;
  servingId: string;
  grams: number;
  calories: number;
  totalFat: number;
  cholesterol: number;
  sodium: number;
  totalCarbohydrate: number;
  sugars: number;
  protein: number;
  isCustom?: boolean;
  servingDescription?: string;
}
