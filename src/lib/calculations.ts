export type Trend = "Increasing" | "Stable" | "Declining" | "N/A";

export interface StockInput {
  ticker?: string;
  price: number;
  eps: number;
  epsHistory: number[];
  bvps: number;
  der: number;
  roe: number;
  dividend: number;
}

export interface CalculationResult {
  per: number | null; // null represents N/A
  pbv: number | null;
  grahamNumber: number | null;
  dividendYield: number;
  epsCagr: number | null;
  epsGrowthTrend: Trend;
  epsGrowthArray: number[];
  dcfValue: number | null;
  peBandValue: number | null;
  fairValue: number | null;
  marginOfSafety: number | null;
  status: "Speculative" | "Undervalued" | "Fair Value" | "Overvalued";
  financialScore: number;
  checklist: {
    roeHigh: boolean;
    derLow: boolean;
    epsPositive: boolean;
    growthPositive: boolean;
    pbvLow: boolean;
    perLow: boolean;
  };
}

export function calculateAnalysis(input: StockInput): CalculationResult {
  const { price, eps, epsHistory, bvps, der, roe, dividend } = input;

  // PER
  const per = eps > 0 ? price / eps : null;

  // PBV
  const pbv = bvps > 0 ? price / bvps : null;

  // Graham Number
  const grahamNumber = eps > 0 && bvps > 0 ? Math.sqrt(22.5 * eps * bvps) : null;

  // Dividend Yield
  const dividendYield = price > 0 ? (dividend / price) * 100 : 0;

  // EPS History Growth
  let epsCagr: number | null = null;
  let epsGrowthTrend: Trend = "N/A";
  const epsGrowthArray: number[] = [];

  if (epsHistory && epsHistory.length >= 3) {
    const first = epsHistory[0];
    const last = epsHistory[epsHistory.length - 1];
    const years = epsHistory.length;
    
    if (first > 0 && last > 0) {
      epsCagr = Math.pow(last / first, 1 / (years - 1)) - 1;
    }

    for (let i = 1; i < epsHistory.length; i++) {
      const prev = epsHistory[i - 1];
      const curr = epsHistory[i];
      if (prev > 0) {
        epsGrowthArray.push((curr - prev) / prev);
      } else {
        epsGrowthArray.push(0);
      }
    }

    if (epsCagr !== null) {
      if (epsCagr > 0.05) epsGrowthTrend = "Increasing";
      else if (epsCagr > -0.05) epsGrowthTrend = "Stable";
      else epsGrowthTrend = "Declining";
    }
  }

  // Growth rate for DCF
  let g = 0;
  if (epsCagr !== null && isFinite(epsCagr) && !isNaN(epsCagr) && epsCagr > 0) {
    g = epsCagr;
  } else if (roe > 0) {
    g = (roe / 100) * 0.25; // ROE is typically percentage (e.g. 15 for 15%), convert to decimal
  }
  g = Math.min(g, 0.10); // cap at 10%

  // DCF
  let dcfValue: number | null = null;
  const discountRate = 0.10;
  
  if (eps > 0) {
    let sumPV = 0;
    let projectedEPS = eps;
    for (let year = 1; year <= 5; year++) {
      projectedEPS *= (1 + g);
      sumPV += projectedEPS / Math.pow(1 + discountRate, year);
    }
    
    // Terminal value
    let terminalValue = 0;
    if (g < discountRate) {
      terminalValue = (projectedEPS * (1 + g)) / (discountRate - g);
    } else {
      // fallback gordon growth
      terminalValue = (projectedEPS * 1.03) / (discountRate - 0.03);
    }
    
    sumPV += terminalValue / Math.pow(1 + discountRate, 5);
    dcfValue = sumPV;
  }

  // PE Band Fair Price
  const peBandValue = eps > 0 ? eps * 15 : null;

  // Weighted Fair Value
  let totalWeight = 0;
  let weightedSum = 0;

  if (grahamNumber !== null) {
    totalWeight += 0.3;
    weightedSum += grahamNumber * 0.2;
  }
  if (dcfValue !== null) {
    totalWeight += 0.4;
    weightedSum += dcfValue * 0.4;
  }
  if (peBandValue !== null) {
    totalWeight += 0.3;
    weightedSum += peBandValue * 0.3;
  }

  const fairValue = totalWeight > 0 ? weightedSum / totalWeight : null;

  // Margin of Safety
  let marginOfSafety: number | null = null;
  if (fairValue !== null && fairValue > 0) {
    marginOfSafety = ((fairValue - price) / fairValue) * 100;
  }

  // Status
  let status: CalculationResult["status"] = "Overvalued";
  if (eps <= 0) {
    status = "Speculative";
  } else if (marginOfSafety !== null) {
    if (marginOfSafety >= 30) status = "Undervalued";
    else if (marginOfSafety >= 10) status = "Fair Value";
  }

  // Financial Score
  let score = 0;
  if (roe > 15) score += 40;
  else if (roe >= 10) score += 25;
  else if (roe > 0) score += 10;

  const isBank = input.ticker?.endsWith(".JK") || der > 3; 
if (isBank) {
  // Bank emang DER-nya tinggi, kasih skor berdasarkan ROE aja
  if (roe > 15) score += 40;
} else {
  if (der < 1) score += 40;
}

  if (g > 0) score += 20;
  else if (g === 0) score += 10;

  // Checklist
  const checklist = {
    roeHigh: roe > 15,
    derLow: der >= 0 && der < 1,
    epsPositive: eps > 0,
    growthPositive: g > 0,
    pbvLow: pbv !== null && pbv < 3,
    perLow: per !== null && per < 15
  };

  return {
    per,
    pbv,
    grahamNumber,
    dividendYield,
    epsCagr,
    epsGrowthTrend,
    epsGrowthArray,
    dcfValue,
    peBandValue,
    fairValue,
    marginOfSafety,
    status,
    financialScore: Math.min(100, Math.max(0, score)),
    checklist
  };
}
