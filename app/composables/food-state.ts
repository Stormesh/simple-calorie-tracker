export const foodTemplateDefault = () => ({
  foodName: "",
  foodId: "",
  servingId: "",
  grams: 0,
  calories: 0,
  totalFat: 0,
  cholesterol: 0,
  sodium: 0,
  totalCarbohydrate: 0,
  sugars: 0,
  protein: 0,
  isCustom: false,
  servingDescription: "",
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
