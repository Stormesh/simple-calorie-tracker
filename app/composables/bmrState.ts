interface BmrForm {
  bmr: number | null;
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: "male" | "female";
  unitSystem: "metric" | "imperial";
  activity: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
  target: -1100 | -825 | -550 | -275 | 0 | 275 | 550;
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
        activity: 1.2,
        target: 0,
      };
    },
  });
