import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { ticker } = req.query;

  if (!ticker || typeof ticker !== "string") {
    return res.status(400).json({ error: "ticker query parameter is required" });
  }

  try {
    const symbol = ticker.toUpperCase();

    const [quote, summary, fundamentals] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.quoteSummary(symbol, {
        modules: ["financialData", "defaultKeyStatistics"],
      }),
      yahooFinance.fundamentalsTimeSeries(symbol, {
        period1: "5y",
        module: "financials",
        type: "annual",
      }),
    ]);

    const price = quote.regularMarketPrice ?? 0;

    // EPS from quote (trailing 12 months)
    const eps = quote.epsTrailingTwelveMonths ?? 0;

    // BVPS from defaultKeyStatistics
    const bvps = summary.defaultKeyStatistics?.bookValue ?? 0;

    // Dividend per share
    const dividendRate = quote.dividendRate ?? quote.trailingAnnualDividendRate ?? 0;

    // ROE & DER from financialData
    const roeRaw = summary.financialData?.returnOnEquity ?? 0;
    const roe = Math.round(roeRaw * 100 * 100) / 100; // 0.15 -> 15

    const derRaw = summary.financialData?.debtToEquity ?? 0;
    const der = Math.round((derRaw / 100) * 100) / 100; // Yahoo returns as percentage (150 -> 1.5)

    // EPS history from fundamentalsTimeSeries (annual income statements, oldest to newest)
    const epsHistory = [];
    if (Array.isArray(fundamentals) && fundamentals.length > 0) {
      for (let i = fundamentals.length - 1; i >= 0; i--) {
        const record = fundamentals[i];
        const annualEPS = record?.basicEPS ?? record?.netIncomeCommonStockholders ?? 0;
        epsHistory.push(annualEPS);
      }
    }

    // Fallback: if epsHistory is empty, use current EPS repeated
    if (epsHistory.length < 3) {
      const fallback = eps || 0;
      epsHistory.length = 0;
      epsHistory.push(fallback, fallback, fallback);
    }

    return res.status(200).json({
      ticker: symbol,
      price,
      eps,
      bvps,
      dividend: Math.round(dividendRate * 100) / 100,
      roe,
      der,
      epsHistory,
      currency: quote.currency ?? "IDR",
      shortName: quote.shortName ?? quote.longName ?? symbol,
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message ?? "Failed to fetch stock data",
    });
  }
}
