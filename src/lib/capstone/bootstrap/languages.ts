export const SUPPORTED_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Japanese",
  "Mandarin Chinese",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
