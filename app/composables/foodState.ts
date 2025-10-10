export const foodsList = ["Breakfast", "Lunch", "Dinner", "Snacks"];

export interface IFoodTemplate {
  foodName: string;
  calories: number;
  totalFat: number;
  sodium: number;
  totalCarbohydrate: number;
  sugars: number;
  protein: number;
  photo: string;
}

export interface IFoodDetails {
  food_name: string;
  serving_qty: number;
  serving_weight_grams: number;
  nf_calories: number;
  nf_total_fat: number;
  nf_sodium: number;
  nf_total_carbohydrate: number;
  nf_sugars: number;
  nf_protein: number;
  photo: {
    thumb: string;
    highres: string | null;
    is_user_uploaded: boolean;
  };
}

export interface IFoodState {
  loading: boolean;
  focused: boolean;
}

export const foodStateDefault = (): IFoodState => ({
  loading: false,
  focused: false,
});

export const foodTemplateDefault = (): IFoodTemplate => ({
  foodName: "",
  calories: 0,
  totalFat: 0,
  sodium: 0,
  totalCarbohydrate: 0,
  sugars: 0,
  protein: 0,
  photo: "",
});

const FOOD_LENGTH = 4;

export const foodArrayDefault = () =>
  Array.from({ length: FOOD_LENGTH }, foodTemplateDefault) as IFoodTemplate[];

export const resetCookies = (cookieNames: string[]) => {
  cookieNames.forEach((cookieName) => {
    const cookie = useCookie<IFoodTemplate[]>(cookieName);
    cookie.value = foodArrayDefault();
  });
  window.location.reload();
};

export const useCardMode = () =>
  useCookie<boolean>("cardMode", {
    default: () => false,
  });
