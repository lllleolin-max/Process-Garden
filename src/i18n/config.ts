import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enUS from "./locales/en-US.json";
import zhCN from "./locales/zh-CN.json";

export type AppLocale = "en-US" | "zh-CN";

export function detectLocale(): AppLocale {
  const saved = localStorage.getItem("process-garden-locale");
  if (saved === "zh-CN" || saved === "en-US") return saved;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

void i18n.use(initReactI18next).init({
  resources: {
    "en-US": { translation: enUS },
    "zh-CN": { translation: zhCN }
  },
  lng: detectLocale(),
  fallbackLng: "en-US",
  interpolation: { escapeValue: false },
  returnNull: false
});

export default i18n;

