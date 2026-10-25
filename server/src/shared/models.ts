/** Toyota models the app supports (keeps searches and prices meaningful). */
export const TOYOTA_MODELS = [
  "Corolla", "Corolla Cross", "Camry", "Crown", "Prius", "GR86", "Supra",
  "RAV4", "RAV4 Hybrid", "bZ4X", "Highlander", "Grand Highlander", "4Runner",
  "Sequoia", "Land Cruiser", "Venza", "Sienna", "Tacoma", "Tundra",
] as const;

export const isToyotaModel = (m: unknown): m is string => typeof m === "string" && (TOYOTA_MODELS as readonly string[]).includes(m);
