export const useCustomToast = () => {
  const toast = useToast();
  const showToast = (title: string, description: string, icon: string) => {
    toast.add({
      title,
      description,
      icon,
    });
  };

  const showFoodError = () => {
    showToast(
      "Invalid food name",
      "Please enter a valid food name",
      "ic:outline-error"
    );
  };

  return {
    showToast,
    showFoodError,
  };
};
