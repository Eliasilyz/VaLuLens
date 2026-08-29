import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const INDONESIAN_STOCKS = [
  "BBCA", "BBRI", "BMRI", "BBNI", "TLKM",
  "ASII", "UNVR", "HMSP", "GGRM", "KLBF",
  "ICBP", "INDF", "SMGR", "TOWR", "EXCL",
  "ISAT", "ADRO", "PTBA", "ANTM", "INCO",
  "MDKA", "CPIN", "WIKA", "WSKT", "JSMR",
];

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

        const [quote, summary, fundamentals] = await Promise.all([
          yahooFinance.quote(symbol),
          yahooFinance.quoteSummary(symbol, {
            modules: ["financialData", "defaultKeyStatistics"],
          }),
          yahooFinance.fundamentalsTimeSeries(symbol, {
            period1: "10y",
            module: "financials",
            type: "annual",
          }),
        ]);

        const price = quote.regularMarketPrice ?? 0;
        const eps = quote.epsTrailingTwelveMonths ?? 0;
        const bvps = summary.defaultKeyStatistics?.bookValue ?? 0;
        const roeRaw = summary.financialData?.returnOnEquity ?? 0;
        const roe = Math.round(roeRaw * 100 * 100) / 100;
        const derRaw = summary.financialData?.debtToEquity ?? 0;
        const der = Math.round((derRaw / 100) * 100) / 100;

        const epsHistory = [];
        if (Array.isArray(fundamentals) && fundamentals.length > 0) {
          for (let i = fundamentals.length - 1; i >= 0; i--) {
            const record = fundamentals[i];
            const annualEPS = record?.basicEPS ?? record?.netIncomeCommonStockholders ?? 0;
            epsHistory.push(annualEPS);
          }
        }

        if (epsHistory.length >= 3) {
          results.push({
            ticker: symbol,
            price,
            eps,
            bvps,
            roe,
            der,
            epsHistory,
          });
        }
      } catch (err) {
        console.error(`Error fetching ${ticker}:`, err.message);
      }
    }

    return res.status(200).json({ stocks: results });
  } catch (error) {
    console.error("Batch fetch error:", error);
    return res.status(500).json({ error: error?.message ?? "Failed to fetch stock data" });
  }
}
