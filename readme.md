# VaLuLens — Stock Intrinsic Value Finder

**VaLuLens** is a web-based fundamental analysis platform that helps investors estimate the intrinsic value of any stock using multiple valuation methods, health scoring, and machine learning growth predictions.

**Live:** [funda.farelhanafi.my.id](https://funda.farelhanafi.my.id)

---

## Features

- **Multi-Method Valuation** — Combines Graham Number, Discounted Cash Flow (DCF), and P/E Band multiple into a weighted fair value estimate.
- **Global Stock Support** — Fetches real-time data from Yahoo Finance for 10+ exchanges: IDX, NYSE/NASDAQ, SGX, Bursa Malaysia, TSE, HKEX, SSE/SZSE, LSE, ASX, KOSPI/KOSDAQ.
- **Health Checklist** — Instant evaluation based on ROE, D/E ratio, P/B, P/E, EPS growth trend, and dividend yield.
- **ML Growth Prediction** — TensorFlow.js LSTM model trained on 25+ Indonesian stocks. Uses multi-feature input (EPS, ROE, D/E, dividend yield) to predict next-year EPS growth.
- **Buy/Sell Price Zones** — Calculates ideal buy price, buy range, and sell target based on intrinsic value and margin of safety.
- **Stock Condition Summary** — Narrative verdict (Strong Buy / Buy / Hold / Sell / Avoid) with positives, risks, and sector-specific notes.
- **Financial Health Score** — 0-100 score combining ROE efficiency, debt level, and growth trajectory.
- **Export & Share** — Save analysis as PNG image or share via URL with embedded parameters.
- **Side-by-Side Comparison** — Compare two stocks across all metrics.

---

## Methodology

### Valuation Models

1. **Graham Number** — `sqrt(22.5 x EPS x BVPS)`. Conservative fair value for companies with positive earnings and book value.

2. **DCF (Discounted Cash Flow)** — Projects EPS forward 5 years using historical CAGR (or ROE-based estimate as fallback), then discounts back at 10% (12% for banks). Terminal value uses Gordon Growth Model.

3. **P/E Band** — `EPS x sector-adjusted P/E`. Uses 15x for most sectors, 12x for banks.

4. **Weighted Fair Value** — Combines all three: 30% Graham + 40% DCF + 30% P/E Band.

### ML Model

- **Architecture:** 2-layer LSTM (64 + 32 units) with dropout, dense output.
- **Features:** 4 per timestep — EPS, ROE, D/E ratio, dividend yield.
- **Training:** 80 epochs on 25+ Indonesian stocks from Yahoo Finance (10-year annual data).
- **Prediction:** Takes last 3 years of multi-feature data, outputs next-year EPS growth rate.
- **Persistence:** Saved to IndexedDB, survives page reloads.

### Bank-Aware Logic

- D/E ratio is excluded from scoring for banks (deposits are liabilities, not debt).
- Bank discount rate is 12% (vs 10% for non-banks).
- P/E fair value threshold is 12x (vs 15x for non-banks).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Vite 8 + React 18 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (New York style) |
| ML | TensorFlow.js (LSTM, runs in-browser) |
| Data | Yahoo Finance API via `yahoo-finance2` |
| Routing | wouter |
| Forms | react-hook-form + zod |
| Charts | Recharts |
| Deployment | Vercel (serverless functions) |
| Fonts | Instrument Serif, DM Sans, IBM Plex Mono |

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Build for production
pnpm build
```

The dev server runs at `http://localhost:5173`. API endpoints are in the `api/` directory and run as Vercel serverless functions.

---

## Project Structure

```
VaLuLens/
  api/
    stock.mjs          # Single stock data endpoint (Yahoo Finance)
    stocks-batch.mjs   # Batch endpoint for ML training data (25+ stocks)
  src/
    lib/
      calculations.ts  # Valuation math, health scoring, price zones
      ml-model.ts      # TensorFlow.js LSTM model (train/predict/save/load)
      exchanges.ts     # Global exchange definitions (suffix, examples)
      currency.ts      # Currency formatting by ticker suffix
    pages/
      Home.tsx         # Landing page with methodology overview
      Analyze.tsx      # Main analysis page (fetch, train, predict, calculate)
      Compare.tsx      # Side-by-side stock comparison
      About.tsx        # Methodology details and disclaimers
    components/
      layout/          # Navbar, Footer
      analyzer/        # EpsChart component
  index.html           # Entry point with SEO meta tags
```

---

## Usage

1. Select an **Exchange** from the dropdown (default: Indonesia / IDX).
2. Enter a **Ticker Symbol** (e.g., `BBCA`, `AAPL`, `0700`).
3. Click the **Search** button to fetch real-time data from Yahoo Finance.
4. The analysis calculates automatically — view intrinsic value, health checklist, buy/sell zones, and condition summary.
5. Optionally **Train the ML model** for EPS growth predictions.
6. **Export** as image or **Share** via link.

---

## Disclaimer

VaLuLens is an educational and decision-support tool, not professional financial advice. Stock investing carries significant risk. Always do your own due diligence before making investment decisions.

---

Developed by **Farel Hanafi** (c) 2026
