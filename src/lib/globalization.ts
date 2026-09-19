export type SupportedLocale = "en" | "sn" | "nd" | "ja" | "zh";
export type CurrencyCode = string;
export type GlobalRegionLevel = "country" | "region" | "city" | "district" | "locality" | "neighbourhood";

export interface GlobalLocation { countryCode: string; countryName: string; regionCode?: string; regionName?: string; city?: string; district?: string; locality?: string; neighbourhood?: string; latitude?: number; longitude?: number; timezone?: string; }
export interface CountryConfig { countryCode: string; defaultCurrency: CurrencyCode; supportedCurrencies: CurrencyCode[]; defaultLocale: SupportedLocale; supportedLocales: SupportedLocale[]; timezone: string; phoneCallingCode: string; }

export const SUFU_LOCALE_DEFAULTS: CountryConfig = { countryCode: "ZW", defaultCurrency: "USD", supportedCurrencies: ["USD","ZWG","ZAR","GBP","EUR"], defaultLocale: "en", supportedLocales: ["en","sn","nd"], timezone: "Africa/Harare", phoneCallingCode: "+263" };
export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  ZW: SUFU_LOCALE_DEFAULTS,
  JP: { countryCode: "JP", defaultCurrency: "JPY", supportedCurrencies: ["JPY","USD"], defaultLocale: "ja", supportedLocales: ["ja","en"], timezone: "Asia/Tokyo", phoneCallingCode: "+81" },
  CN: { countryCode: "CN", defaultCurrency: "CNY", supportedCurrencies: ["CNY","USD"], defaultLocale: "zh", supportedLocales: ["zh","en"], timezone: "Asia/Shanghai", phoneCallingCode: "+86" },
};

export const SUPPORTED_LOCALES: { code: SupportedLocale; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" }, { code: "sn", label: "Shona", nativeLabel: "ChiShona" }, { code: "nd", label: "Ndebele", nativeLabel: "isiNdebele" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" }, { code: "zh", label: "Chinese", nativeLabel: "中文" },
];
export function currencyForCountry(countryCode: string): CurrencyCode { return COUNTRY_CONFIGS[countryCode.toUpperCase()]?.defaultCurrency ?? "USD"; }
export function countryConfig(countryCode: string): CountryConfig { return COUNTRY_CONFIGS[countryCode.toUpperCase()] ?? { countryCode: countryCode.toUpperCase(), defaultCurrency: "USD", supportedCurrencies: ["USD"], defaultLocale: "en", supportedLocales: ["en"], timezone: "UTC", phoneCallingCode: "" }; }
export function locationLabel(location: GlobalLocation): string { return [location.neighbourhood, location.locality, location.city, location.regionName, location.countryName].filter(Boolean).join(" · "); }