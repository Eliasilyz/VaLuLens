export interface Exchange {
  country: string;
  flag: string;
  exchange: string;
  suffix: string;
  placeholder: string;
  examples: string;
}

export const EXCHANGES: Exchange[] = [
  { country: "Indonesia", flag: "🇮🇩", exchange: "IDX", suffix: ".JK", placeholder: "BBCA", examples: "BBCA, BBRI, TLKM" },
  { country: "United States", flag: "🇺🇸", exchange: "NYSE / NASDAQ", suffix: "US", placeholder: "AAPL", examples: "AAPL, TSLA, MSFT" },
  { country: "Singapore", flag: "🇸🇬", exchange: "SGX", suffix: ".SI", placeholder: "D05", examples: "D05.SI (DBS), U11.SI (UOB)" },
  { country: "Malaysia", flag: "🇲🇾", exchange: "Bursa Malaysia", suffix: ".KL", placeholder: "1155", examples: "1155.KL (Maybank)" },
  { country: "Japan", flag: "🇯🇵", exchange: "Tokyo Stock Exchange", suffix: ".T", placeholder: "7203", examples: "7203.T (Toyota)" },
  { country: "Hong Kong", flag: "🇭🇰", exchange: "HKEX", suffix: ".HK", placeholder: "0700", examples: "0700.HK (Tencent)" },
  { country: "China", flag: "🇨🇳", exchange: "SSE / SZSE", suffix: ".SS", placeholder: "600519", examples: "600519.SS, 000858.SZ" },
  { country: "United Kingdom", flag: "🇬🇧", exchange: "LSE", suffix: ".L", placeholder: "BP.", examples: "BP.L (BP), HSBA.L (HSBC)" },
  { country: "Australia", flag: "🇦🇺", exchange: "ASX", suffix: ".AX", placeholder: "BHP", examples: "BHP.AX, CBA.AX" },
  { country: "South Korea", flag: "🇰🇷", exchange: "KOSPI / KOSDAQ", suffix: ".KS", placeholder: "005930", examples: "005930.KS (Samsung)" },
];

export function getExchangeBySuffix(suffix: string): Exchange | undefined {
  return EXCHANGES.find((e) => e.suffix === suffix);
}

export function getTickerWithSuffix(ticker: string, suffix: string): string {
  const upper = ticker.toUpperCase().trim();
  // US stocks don't need a suffix
  if (suffix === "US") return upper;
  // If user already typed the suffix, don't double-add
  if (suffix && upper.endsWith(suffix)) return upper;
  // If user typed a different suffix (e.g. .JK when exchange is .SI), replace it
  const withoutOldSuffix = upper.replace(/\.[A-Z]{1,3}$/, "");
  return withoutOldSuffix + suffix;
}
