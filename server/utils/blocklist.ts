import leoProfanity from "leo-profanity";

export const containsBlockedTerm = (text: string): boolean => {
  return leoProfanity.check(text);
};
