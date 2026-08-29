export interface CurrencyConfig {
  code: string;
  locale: string;
  fractionDigits: number;
}

const SUFFIX_MAP: Record<string, CurrencyConfig> = {
  JK: { code: "IDR", locale: "id-ID", fractionDigits: 0 },
  JKT: { code: "IDR", locale: "id-ID", fractionDigits: 0 },
  HK: { code: "HKD", locale: "zh-HK", fractionDigits: 2 },
  T: { code: "JPY", locale: "ja-JP", fractionDigits: 0 },
  TO: { code: "CAD", locale: "en-CA", fractionDigits: 2 },
  L: { code: "GBP", locale: "en-GB", fractionDigits: 2 },
  PA: { code: "EUR", locale: "fr-FR", fractionDigits: 2 },
  DE: { code: "EUR", locale: "de-DE", fractionDigits: 2 },
  AX: { code: "AUD", locale: "en-AU", fractionDigits: 2 },
  SI: { code: "SGD", locale: "en-SG", fractionDigits: 2 },
  KS: { code: "KRW", locale: "ko-KR", fractionDigits: 0 },
  KQ: { code: "KRW", locale: "ko-KR", fractionDigits: 0 },
  SS: { code: "CNY", locale: "zh-CN", fractionDigits: 2 },
  SZ: { code: "CNY", locale: "zh-CN", fractionDigits: 2 },
  BO: { code: "INR", locale: "en-IN", fractionDigits: 2 },
  NS: { code: "INR", locale: "en-IN", fractionDigits: 2 },
  US: { code: "USD", locale: "en-US", fractionDigits: 2 },
};

const DEFAULT_CONFIG: CurrencyConfig = {
  code: "IDR",
  locale: "id-ID",
  fractionDigits: 0,
};

export function detectCurrency(ticker?: string | null, exchangeSuffix?: string): CurrencyConfig {
  // First try to detect from the ticker itself (e.g. "BBCA.JK" → JK)
  if (ticker) {
    const trimmed = ticker.trim().toUpperCase();
    const dotIdx = trimmed.lastIndexOf(".");
    if (dotIdx !== -1) {
      const suffix = trimmed.slice(dotIdx + 1);
      const match = SUFFIX_MAP[suffix];
      if (match) return match;
    }
  }
  // Fall back to the selected exchange suffix (e.g. ".SI" → SI)
  if (exchangeSuffix) {
    const clean = exchangeSuffix.replace(".", "").trim().toUpperCase();
    if (clean) {
      const match = SUFFIX_MAP[clean];
      if (match) return match;
    }
  }
  return DEFAULT_CONFIG;
}

export function formatCurrency(value: number | null | undefined, ticker?: string | null, exchangeSuffix?: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  const cfg = detectCurrency(ticker, exchangeSuffix);
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency: cfg.code,
    minimumFractionDigits: cfg.fractionDigits,
    maximumFractionDigits: cfg.fractionDigits,
  }).format(value);
}

export function getCurrencyCode(ticker?: string | null, exchangeSuffix?: string): string {
  return detectCurrency(ticker, exchangeSuffix).code;
}
