export interface IFoodListContext {
  changeFoodDetails: (index: number, scroll?: boolean) => Promise<void>;
  openFoodSearch: (index: number) => void;
  editFood: (index: number) => Promise<void>;
  searchAndSelectServing: (index: number, scroll?: boolean) => Promise<void>;
  onFocus: (index: number, focus: boolean) => void;
  resetFoodIfEmpty: (index: number) => void;
  deleteItem: (index: number) => void;
}

export const FOOD_LIST_KEY: InjectionKey<IFoodListContext> = Symbol("food-list");
