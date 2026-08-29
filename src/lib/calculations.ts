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
  epsHistorySource?: "real" | "fallback";
}

export interface PriceZone {
  buyBelow: number;      // ideal buy price (fairValue - 30% MoS)
  buyRangeLow: number;   // acceptable buy range start (fairValue - 15%)
  buyRangeHigh: number;  // acceptable buy range end (fairValue - 5%)
  sellTarget: number;    // take profit target (fairValue + 10%)
  currentPrice: number;
}

export interface StockCondition {
  verdict: "Strong Buy" | "Buy" | "Hold" | "Sell" | "Avoid";
  verdictID: string;
  risks: string[];
  positives: string[];
  sectorNote: string;
}

export interface CalculationResult {
  per: number | null;
  pbv: number | null;
  grahamNumber: number | null;
  dividendYield: number;
  epsCagr: number | null;
  epsGrowthTrend: Trend;
  epsGrowthArray: number[];
  dcfValue: number | null;
  dcfValueML: number | null;
  peBandValue: number | null;
  fairValue: number | null;
  fairValueML: number | null;
  marginOfSafety: number | null;
  marginOfSafetyML: number | null;
  status: "Speculative" | "Undervalued" | "Fair Value" | "Overvalued";
  statusML: "Speculative" | "Undervalued" | "Fair Value" | "Overvalued";
  financialScore: number;
  mlGrowthRate: number | null;
  priceZone: PriceZone | null;
  priceZoneML: PriceZone | null;
  condition: StockCondition;
  checklist: {
    roeHigh: boolean;
    derLow: boolean;
    epsPositive: boolean;
    growthPositive: boolean;
    pbvLow: boolean;
    perLow: boolean;
  };
}

function buildPriceZone(fairValue: number | null, price: number): PriceZone | null {
  if (fairValue === null || fairValue <= 0) return null;
  return {
    buyBelow: Math.round(fairValue * 0.70),
    buyRangeLow: Math.round(fairValue * 0.85),
    buyRangeHigh: Math.round(fairValue * 0.95),
    sellTarget: Math.round(fairValue * 1.10),
    currentPrice: price,
  };
}

function buildCondition(
  input: StockInput,
  result: {
    isBank: boolean;
    status: string;
    statusML: string;
    marginOfSafety: number | null;
    marginOfSafetyML: number | null;
    epsCagr: number | null;
    epsGrowthTrend: string;
    growthSource: "cagr" | "roe" | "none";
    financialScore: number;
    per: number | null;
    pbv: number | null;
    der: number;
    roe: number;
    dividendYield: number;
    checklist: { roeHigh: boolean; derLow: boolean; epsPositive: boolean; growthPositive: boolean; pbvLow: boolean; perLow: boolean };
  }
): StockCondition {
  const risks: string[] = [];
  const positives: string[] = [];
  const { isBank } = result;

  // Analyze positives
  if (result.checklist.roeHigh) positives.push(`ROE ${result.roe.toFixed(1)}% — di atas 15%, modal efficient`);
  if (!isBank && result.checklist.derLow) positives.push(`D/E ${result.der.toFixed(2)} — rendah, utang terkendali`);
  if (isBank) positives.push("Bank — D/E tidak relevan, fokus pada kualitas aset");
  if (result.checklist.epsPositive) positives.push("EPS positif — perusahaan untung");
  if (result.checklist.growthPositive) positives.push("EPS growth meningkat — tren naik");
  if (result.checklist.pbvLow) positives.push(`P/B ${result.pbv?.toFixed(1)} — di bawah 3, murah relatif terhadap book value`);
  if (result.checklist.perLow) positives.push(`P/E ${result.per?.toFixed(1)} — di bawah ${isBank ? 12 : 15}, murah relatif terhadap earnings`);
  if (result.dividendYield >= 4) positives.push(`Dividend yield ${result.dividendYield.toFixed(1)}% — passive income bagus`);
  if (result.epsGrowthTrend === "Increasing") positives.push("Trend EPS meningkat konsisten");
  if (result.epsCagr !== null && result.epsCagr > 0.05) positives.push(`EPS CAGR ${(result.epsCagr * 100).toFixed(1)}% — pertumbuhan kuat`);

  // Analyze risks
  if (!result.checklist.roeHigh) risks.push(`ROE ${result.roe.toFixed(1)}% — di bawah 15%, kurang efficient`);
  if (!isBank && !result.checklist.derLow) risks.push(`D/E ${result.der.toFixed(2)} — tinggi, utang besar`);
  if (!result.checklist.epsPositive) risks.push("EPS negatif — perusahaan rugi");
  if (result.epsGrowthTrend === "Declining") risks.push("EPS growth menurun — tren negatif");
  if (result.per !== null && result.per > 25) risks.push(`P/E ${result.per.toFixed(1)} — terlalu mahal`);
  if (result.pbv !== null && result.pbv > 5) risks.push(`P/B ${result.pbv?.toFixed(1)} — overvalued relatif terhadap book value`);
  if (result.dividendYield < 1 && result.dividendYield > 0) risks.push(`Dividend yield ${result.dividendYield.toFixed(1)}% — sangat rendah`);
    if (input.epsHistory.length < 4) risks.push("Data EPS kurang dari 4 tahun — prediksi kurang akurat");
    if (input.epsHistorySource === "fallback") risks.push("EPS history tidak tersedia dari API — menggunakan data fallback, pertumbuhan diestimasi dari ROE");
    else if (result.growthSource === "roe") risks.push("Growth diestimasi dari ROE (EPS CAGR tidak positif) — hasil bisa kurang akurat");

  // Verdict
  let verdict: StockCondition["verdict"] = "Hold";
  let verdictID = "Tahan";
  const status = result.statusML !== "Speculative" ? result.statusML : result.status;
  const mos = result.marginOfSafetyML ?? result.marginOfSafety;

  if (status === "Undervalued" && result.financialScore >= 60) {
    verdict = "Strong Buy";
    verdictID = "Beli Kuat";
  } else if (status === "Undervalued" || (status === "Fair Value" && mos !== null && mos >= 15)) {
    verdict = "Buy";
    verdictID = "Beli";
  } else if (status === "Fair Value") {
    verdict = "Hold";
    verdictID = "Tahan";
  } else if (status === "Overvalued") {
    verdict = "Sell";
    verdictID = "Jual";
  }

  if (!result.checklist.epsPositive) {
    verdict = "Avoid";
    verdictID = "Hindari";
  }

  // Sector note
  let sectorNote = "";
  if (isBank) {
    sectorNote = "Bank: D/E tinggi adalah norma (simpanan nasabah = liabilitas). Fokus pada ROE, NPL, pertumbuhan kredit, dan net interest margin.";
  } else if (input.ticker?.includes("TLKM")) {
    sectorNote = "Telekom: Stabil tapi growth terbatas. Monitor subscriber growth dan ARPU.";
  }

  return { verdict, verdictID, risks, positives, sectorNote };
}

function isBankStock(ticker?: string): boolean {
  if (!ticker) return false;
  const t = ticker.toUpperCase().replace(".JK", "");
  const bankTickers = [
    "BBCA", "BBRI", "BMRI", "BBNI", "BTPS", "BGTG", "BDMN",
    "NISP", "MEGA", "ARTO", "BBYB", "BANK", "BINA", "PNBN",
    "SMMA", "BBSS", "BTPX",
  ];
  return bankTickers.some((b) => t.startsWith(b));
}

export function calculateAnalysis(input: StockInput, mlGrowthRate?: number | null): CalculationResult {
  const { price, eps, epsHistory, bvps, der, roe, dividend } = input;
  const isBank = isBankStock(input.ticker);

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
  let growthSource: "cagr" | "roe" | "none" = "none";
  if (epsCagr !== null && isFinite(epsCagr) && !isNaN(epsCagr) && epsCagr > 0) {
    g = epsCagr;
    growthSource = "cagr";
  } else if (roe > 0) {
    // For banks, ROE is a better proxy for sustainable growth
    g = isBank ? (roe / 100) * 0.30 : (roe / 100) * 0.25;
    growthSource = "roe";
  }
  g = Math.min(g, 0.10);

  // DCF
  let dcfValue: number | null = null;
  const discountRate = isBank ? 0.12 : 0.10; // banks get higher discount rate

  if (eps > 0) {
    let sumPV = 0;
    let projectedEPS = eps;
    for (let year = 1; year <= 5; year++) {
      projectedEPS *= (1 + g);
      sumPV += projectedEPS / Math.pow(1 + discountRate, year);
    }

    let terminalValue = 0;
    if (g < discountRate) {
      terminalValue = (projectedEPS * (1 + g)) / (discountRate - g);
    } else {
      terminalValue = (projectedEPS * 1.03) / (discountRate - 0.03);
    }

    sumPV += terminalValue / Math.pow(1 + discountRate, 5);
    dcfValue = sumPV;
  }

  // ML-based DCF
  let dcfValueML: number | null = null;
  const mlG = (mlGrowthRate !== null && mlGrowthRate !== undefined && mlGrowthRate > 0)
    ? Math.min(mlGrowthRate / 100, 0.10)
    : g;

  if (eps > 0 && mlG > 0) {
    let sumPVml = 0;
    let projectedEPSml = eps;
    for (let year = 1; year <= 5; year++) {
      projectedEPSml *= (1 + mlG);
      sumPVml += projectedEPSml / Math.pow(1 + discountRate, year);
    }
    let terminalValueML = 0;
    if (mlG < discountRate) {
      terminalValueML = (projectedEPSml * (1 + mlG)) / (discountRate - mlG);
    } else {
      terminalValueML = (projectedEPSml * 1.03) / (discountRate - 0.03);
    }
    sumPVml += terminalValueML / Math.pow(1 + discountRate, 5);
    dcfValueML = sumPVml;
  } else if (dcfValue !== null) {
    dcfValueML = dcfValue;
  }

  // PE Band Fair Price — sector-adjusted
  const peFair = isBank ? 12 : 15; // banks typically trade at lower P/E
  const peBandValue = eps > 0 ? eps * peFair : null;

  // Weighted Fair Value
  let totalWeight = 0;
  let weightedSum = 0;

  if (grahamNumber !== null) {
    totalWeight += 0.3;
    weightedSum += grahamNumber * 0.3;
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

  // ML Fair Value
  let mlTotalWeight = 0;
  let mlWeightedSum = 0;
  if (grahamNumber !== null) {
    mlTotalWeight += 0.3;
    mlWeightedSum += grahamNumber * 0.3;
  }
  if (dcfValueML !== null) {
    mlTotalWeight += 0.4;
    mlWeightedSum += dcfValueML * 0.4;
  }
  if (peBandValue !== null) {
    mlTotalWeight += 0.3;
    mlWeightedSum += peBandValue * 0.3;
  }
  const fairValueML = mlTotalWeight > 0 ? mlWeightedSum / mlTotalWeight : null;

  // Margin of Safety
  let marginOfSafety: number | null = null;
  if (fairValue !== null && fairValue > 0) {
    marginOfSafety = ((fairValue - price) / fairValue) * 100;
  }

  let marginOfSafetyML: number | null = null;
  if (fairValueML !== null && fairValueML > 0) {
    marginOfSafetyML = ((fairValueML - price) / fairValueML) * 100;
  }

  // Status
  let status: CalculationResult["status"] = "Overvalued";
  if (eps <= 0) {
    status = "Speculative";
  } else if (marginOfSafety !== null) {
    if (marginOfSafety >= 30) status = "Undervalued";
    else if (marginOfSafety >= 10) status = "Fair Value";
  }

  let statusML: CalculationResult["statusML"] = "Overvalued";
  if (eps <= 0) {
    statusML = "Speculative";
  } else if (marginOfSafetyML !== null) {
    if (marginOfSafetyML >= 30) statusML = "Undervalued";
    else if (marginOfSafetyML >= 10) statusML = "Fair Value";
  }

  // Financial Score — no double counting, bank-aware
  let score = 0;

  // ROE component (max 40)
  if (roe > 15) score += 40;
  else if (roe >= 10) score += 25;
  else if (roe > 0) score += 10;

  // DER component (max 40) — banks excluded, D/E meaningless for them
  if (!isBank) {
    if (der < 1) score += 40;
    else if (der < 2) score += 20;
  }

  // Growth component (max 20)
  if (g > 0) score += 20;
  else if (g === 0) score += 10;

  // Checklist — bank-aware
  const checklist = {
    roeHigh: roe > 15,
    derLow: isBank ? true : der >= 0 && der < 1, // banks always pass DER
    epsPositive: eps > 0,
    growthPositive: g > 0 && growthSource === "cagr", // only if from real CAGR data
    pbvLow: pbv !== null && pbv < 3,
    perLow: per !== null && per < peFair
  };

  // Price Zones
  const priceZone = buildPriceZone(fairValue, price);
  const priceZoneML = buildPriceZone(fairValueML, price);

  // Stock Condition
  const condition = buildCondition(input, {
    isBank,
    status,
    statusML,
    marginOfSafety,
    marginOfSafetyML,
    epsCagr,
    epsGrowthTrend,
    growthSource,
    financialScore: Math.min(100, Math.max(0, score)),
    per,
    pbv,
    der,
    roe,
    dividendYield,
    checklist,
  });

  return {
    per,
    pbv,
    grahamNumber,
    dividendYield,
    epsCagr,
    epsGrowthTrend,
    epsGrowthArray,
    dcfValue,
    dcfValueML,
    peBandValue,
    fairValue,
    fairValueML,
    marginOfSafety,
    marginOfSafetyML,
    status,
    statusML,
    financialScore: Math.min(100, Math.max(0, score)),
    mlGrowthRate: mlGrowthRate ?? null,
    priceZone,
    priceZoneML,
    condition,
    checklist
  };
}
