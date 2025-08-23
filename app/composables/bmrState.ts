interface BmrForm {
  bmr: number | null;
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: "male" | "female";
  unitSystem: "metric" | "imperial";
}

export const useBmr = () =>
  useCookie<BmrForm>("bmr", {
    default: () => {
      return {
        bmr: null,
        weight: null,
        height: null,
        age: null,
        gender: "male",
        unitSystem: "metric",
      };
    },
  });
