export type SettingsPanelAction = "diet" | "library" | "reset";

export const useSettingsPanel = () => {
  const open = useState<boolean>("settings-panel-open", () => false);

  const openPanel = () => {
    open.value = true;
  };

  const closePanel = () => {
    open.value = false;
  };

  const togglePanel = () => {
    open.value = !open.value;
  };

  return { open, openPanel, closePanel, togglePanel };
};

export const usePlayerProfile = () => {
  const name = useCookie<string>("player-name", {
    default: () => "",
  });

  const avatarLetter = computed(() => (name.value.trim().charAt(0) || "M").toUpperCase());

  return { name, avatarLetter };
};
