import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const INDONESIAN_STOCKS = [
  "BBCA", "BBRI", "BMRI", "BBNI", "TLKM",
  "ASII", "UNVR", "HMSP", "GGRM", "KLBF",
  "ICBP", "INDF", "SMGR", "TOWR", "EXCL",
  "ISAT", "ADRO", "PTBA", "ANTM", "INCO",
  "CPIN", "JSMR", "MEDC", "PGAS", "BFIN",
];

async function fetchWithTimeout(promiseFn, timeoutMs = 8000) {
  return Promise.race([
    promiseFn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), timeoutMs)
    ),
  ]);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const results = [];

    for (const ticker of INDONESIAN_STOCKS) {
      try {
        const symbol = `${ticker}.JK`;

        const quote = await fetchWithTimeout(() => yahooFinance.quote(symbol));
        const price = quote.regularMarketPrice ?? 0;
        const eps = quote.epsTrailingTwelveMonths ?? 0;

        // Try quoteSummary separately, skip on failure
        let bvps = 0, roe = 0, der = 0, dividendYield = 0;
        try {
          const summary = await fetchWithTimeout(() =>
            yahooFinance.quoteSummary(symbol, {
              modules: ["financialData", "defaultKeyStatistics"],
            })
          );
          bvps = summary.defaultKeyStatistics?.bookValue ?? 0;
          const roeRaw = summary.financialData?.returnOnEquity ?? 0;
          roe = Math.round(roeRaw * 100 * 100) / 100;
          const derRaw = summary.financialData?.debtToEquity ?? 0;
          der = Math.round((derRaw / 100) * 100) / 100;
          dividendYield = summary.financialData?.dividendYield ?? 0;
          if (dividendYield > 1) dividendYield = dividendYield / 100; // normalize to decimal
        } catch {
          // skip summary data
        }

        // Try fundamentals separately, skip on failure
        let epsHistory = [];
        try {
          const fundamentals = await fetchWithTimeout(() =>
            yahooFinance.fundamentalsTimeSeries(symbol, {
              period1: "10y",
              module: "financials",
              type: "annual",
            })
          );
          if (Array.isArray(fundamentals) && fundamentals.length > 0) {
            for (let i = fundamentals.length - 1; i >= 0; i--) {
              const record = fundamentals[i];
              const annualEPS = record?.basicEPS ?? record?.dilutedEPS ?? record?.epsOutstanding ?? record?.earningsPerShare ?? null;
              if (annualEPS != null) epsHistory.push(annualEPS);
            }

            // Fallback: try netIncome / sharesOutstanding if not enough EPS data
            if (epsHistory.length < 5) {
              const epsFromNetIncome = [];
              for (let i = fundamentals.length - 1; i >= 0; i--) {
                const record = fundamentals[i];
                const netIncome = record?.netIncomeCommonStockholders;
                const shares = record?.sharesOutstanding;
                if (netIncome != null && shares != null && shares > 0) {
                  epsFromNetIncome.push(netIncome / shares);
                }
              }
              if (epsFromNetIncome.length > epsHistory.length) {
                epsHistory.length = 0;
                epsHistory.push(...epsFromNetIncome);
              }
            }
          }
        } catch {
          // skip fundamentals
        }

        // Only include if we got enough data
        if (epsHistory.length >= 3 && eps > 0) {
          results.push({ ticker: symbol, price, eps, bvps, roe, der, dividendYield, epsHistory });
        }
      } catch {
        // Skip this stock entirely
      }
    }

    return res.status(200).json({ stocks: results });
  } catch (error) {
    return res.status(500).json({ error: error?.message ?? "Failed to fetch stock data" });
  }
}
