import { create } from "zustand";

const storageKey = "chatverseSettings";

const loadSettings = () => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
};

const saveSettings = (settings) => {
  localStorage.setItem(storageKey, JSON.stringify(settings));
};

const savedSettings = loadSettings();

const useSettingsStore = create((set, get) => ({
  readReceipts: savedSettings.readReceipts ?? true,
  chatBackground: savedSettings.chatBackground || "default",
  chatBackgroundImage: savedSettings.chatBackgroundImage || "",
  theme: savedSettings.theme || "dark",

  setReadReceipts: (readReceipts) => {
    const settings = {
      readReceipts,
      chatBackground: get().chatBackground,
      chatBackgroundImage: get().chatBackgroundImage,
      theme: get().theme,
    };
    saveSettings(settings);
    set({ readReceipts });
  },

  setChatBackground: (chatBackground) => {
    const settings = {
      readReceipts: get().readReceipts,
      chatBackground,
      chatBackgroundImage: get().chatBackgroundImage,
      theme: get().theme,
    };
    saveSettings(settings);
    set({ chatBackground });
  },

  setChatBackgroundImage: (chatBackgroundImage) => {
    const settings = {
      readReceipts: get().readReceipts,
      chatBackground: chatBackgroundImage ? "custom" : "default",
      chatBackgroundImage,
      theme: get().theme,
    };
    saveSettings(settings);
    set({ chatBackground: settings.chatBackground, chatBackgroundImage });
  },

  setTheme: (theme) => {
    const settings = {
      readReceipts: get().readReceipts,
      chatBackground: get().chatBackground,
      chatBackgroundImage: get().chatBackgroundImage,
      theme,
    };
    saveSettings(settings);
    set({ theme });
  },
}));

export default useSettingsStore;
