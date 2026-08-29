import type { VercelRequest, VercelResponse } from "@vercel/node";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const [quote, summary] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.quoteSummary(symbol, {
        modules: [
          "incomeStatementHistory",
          "balanceSheetHistory",
          "defaultKeyStatistics",
          "summaryDetail",
          "financialData",
        ],
      }),
    ]);

    const price = quote.regularMarketPrice ?? 0;

    // TTM EPS
    const incomeStatements = summary.incomeStatementHistory?.incomeStatementHistory ?? [];
    const latestIncome = incomeStatements[0];
    const eps = latestIncome?.basicEps ?? latestIncome?.dilutedEps ?? 0;

    // Shares outstanding
    const sharesOutstanding =
      summary.defaultKeyStatistics?.sharesOutstanding ??
      summary.summaryDetail?.sharesOutstanding ??
      0;

    // Dividend per share (annual)
    const dividendRate = summary.summaryDetail?.dividendRate ?? 0;
    const dividendYieldRaw = summary.summaryDetail?.dividendYield ?? 0;
    const dividendPerShare = dividendRate > 0 ? dividendRate : price * dividendYieldRaw;

    // BVPS from latest balance sheet
    const balanceSheets = summary.balanceSheetHistory?.balanceSheetHistory ?? [];
    const latestBS = balanceSheets[0];
    const totalEquity = latestBS?.totalStockholderEquity ?? 0;
    const bvps = sharesOutstanding > 0 ? totalEquity / sharesOutstanding : 0;

    // ROE & DER
    const roeRaw = summary.defaultKeyStatistics?.returnOnEquity ?? 0;
    const roe = Math.round(roeRaw * 100 * 100) / 100; // convert 0.15 -> 15

    const derRaw = summary.defaultKeyStatistics?.debtToEquity ?? 0;
    const der = Math.round((derRaw / 100) * 100) / 100; // Yahoo returns as percentage (e.g. 150 for 1.5)

    // EPS history (annual, oldest to newest)
    const epsHistory: number[] = [];
    for (let i = incomeStatements.length - 1; i >= 0; i--) {
      const statement = incomeStatements[i];
      const annualEPS = statement?.basicEps ?? statement?.dilutedEps ?? 0;
      epsHistory.push(annualEPS);
    }

    return res.status(200).json({
      ticker: symbol,
      price,
      eps,
      bvps,
      dividend: Math.round(dividendPerShare * 100) / 100,
      roe,
      der,
      epsHistory,
      currency: quote.currency ?? "IDR",
      shortName: quote.shortName ?? quote.longName ?? symbol,
    });
  } catch (error: any) {
    console.error("Yahoo Finance error:", error);
    return res.status(500).json({
      error: error?.message ?? "Failed to fetch stock data",
    });
  }
}
