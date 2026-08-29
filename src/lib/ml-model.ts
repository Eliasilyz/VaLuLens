import * as tf from "@tensorflow/tfjs";

export interface TrainingStock {
  ticker: string;
  epsHistory: number[];
  roe: number;
  der: number;
  dividendYield: number;
}

export interface MLPrediction {
  predictedGrowthRate: number;
  confidence: number;
  nextYearEPS: number;
  predictedROE: number;
}

const SEQUENCE_LENGTH = 3;
const NUM_FEATURES = 4; // eps, roe, der, dividendYield
const MODEL_URL = "indexeddb://valulens-ml-v2";

function normalize(values: number[]): { normalized: number[]; min: number; max: number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return {
    normalized: values.map((v) => (v - min) / range),
    min,
    max,
  };
}

function normalizeMulti(rows: number[][]): { normalized: number[][]; mins: number[]; maxs: number[] } {
  const numCols = rows[0]?.length ?? 0;
  const mins: number[] = [];
  const maxs: number[] = [];
  for (let c = 0; c < numCols; c++) {
    const col = rows.map((r) => r[c]);
    mins.push(Math.min(...col));
    maxs.push(Math.max(...col));
  }
  const normalized = rows.map((row) =>
    row.map((v, c) => {
      const range = maxs[c] - mins[c] || 1;
      return (v - mins[c]) / range;
    })
  );
  return { normalized, mins, maxs };
}

function createSequences(stocks: TrainingStock[]): {
  xs: number[][][];
  ys: number[];
  featureMins: number[];
  featureMaxs: number[];
} {
  const allFeatures: number[][][] = [];

  for (const stock of stocks) {
    const { epsHistory, roe, der, dividendYield } = stock;
    if (epsHistory.length < SEQUENCE_LENGTH + 1) continue;

    const featureRows: number[][] = epsHistory.map((eps) => [
      eps,
      roe,
      der,
      dividendYield,
    ]);

    const { normalized } = normalizeMulti(featureRows);

    for (let i = 0; i <= normalized.length - SEQUENCE_LENGTH - 1; i++) {
      const seq = normalized.slice(i, i + SEQUENCE_LENGTH);
      allFeatures.push(seq);
    }
  }

  const ys: number[] = [];
  for (const stock of stocks) {
    const { epsHistory } = stock;
    if (epsHistory.length < SEQUENCE_LENGTH + 1) continue;

    const { normalized } = normalize(epsHistory);

    for (let i = 0; i <= normalized.length - SEQUENCE_LENGTH - 1; i++) {
      ys.push(normalized[i + SEQUENCE_LENGTH]);
    }
  }

  // Compute global feature mins/maxs for denormalization
  const allFlat: number[][] = [];
  for (const stock of stocks) {
    const { epsHistory, roe, der, dividendYield } = stock;
    for (const eps of epsHistory) {
      allFlat.push([eps, roe, der, dividendYield]);
    }
  }
  const { mins: featureMins, maxs: featureMaxs } = normalizeMulti(allFlat);

  return { xs: allFeatures, ys, featureMins, featureMaxs };
}

function buildModel(): tf.LayersModel {
  const model = tf.sequential();

  model.add(tf.layers.lstm({
    units: 64,
    inputShape: [SEQUENCE_LENGTH, NUM_FEATURES],
    returnSequences: true,
  }));

  model.add(tf.layers.dropout({ rate: 0.3 }));

  model.add(tf.layers.lstm({
    units: 32,
    returnSequences: false,
  }));

  model.add(tf.layers.dropout({ rate: 0.2 }));

  model.add(tf.layers.dense({ units: 16, activation: "relu" }));

  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

  model.compile({
    optimizer: tf.train.adam(0.005),
    loss: "meanSquaredError",
    metrics: ["mae"],
  });

  return model;
}

function prepareTrainingData(stocks: TrainingStock[]): {
  features: tf.Tensor3D;
  labels: tf.Tensor2D;
  featureMins: number[];
  featureMaxs: number[];
} {
  const { xs, ys, featureMins, featureMaxs } = createSequences(stocks);

  if (xs.length === 0) {
    throw new Error("Not enough EPS data points. Each stock needs at least 4 years of EPS history.");
  }

  const flatData: number[] = [];
  for (const x of xs) {
    for (const row of x) {
      for (const val of row) {
        flatData.push(val);
      }
    }
  }

  const featuresTensor = tf.tensor3d(flatData, [xs.length, SEQUENCE_LENGTH, NUM_FEATURES]);
  const labelsTensor = tf.tensor2d(ys, [ys.length, 1]);

  return { features: featuresTensor, labels: labelsTensor, featureMins, featureMaxs };
}

export async function trainModel(
  stocks: TrainingStock[],
  onProgress?: (epoch: number, loss: number) => void
): Promise<tf.LayersModel> {
  const { features, labels, featureMins, featureMaxs } = prepareTrainingData(stocks);

  const model = buildModel();

  await model.fit(features, labels, {
    epochs: 80,
    batchSize: 32,
    shuffle: true,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        onProgress?.(epoch + 1, logs?.loss ?? 0);
      },
    },
  });

  // Save model + normalization params together
  const modelJSON = await model.toJSON();
  const saveData = {
    modelJSON,
    featureMins,
    featureMaxs,
    epsMin: Math.min(...stocks.flatMap((s) => s.epsHistory)),
    epsMax: Math.max(...stocks.flatMap((s) => s.epsHistory)),
  };

  // Use tf.io browserDownloads as fallback, but primarily IndexedDB
  try {
    await model.save(MODEL_URL);
    // Also save normalization params to localStorage as companion
    localStorage.setItem(MODEL_URL + ":norm", JSON.stringify({
      featureMins,
      featureMaxs,
      epsMin: saveData.epsMin,
      epsMax: saveData.epsMax,
    }));
  } catch {
    // If IndexedDB fails, try localStorage fallback
    try {
      await model.save("localstorage://valulens-ml-v2");
      localStorage.setItem("localstorage://valulens-ml-v2:norm", JSON.stringify({
        featureMins,
        featureMaxs,
        epsMin: saveData.epsMin,
        epsMax: saveData.epsMax,
      }));
    } catch {
      // Model saved in memory only
    }
  }

  features.dispose();
  labels.dispose();

  return model;
}

interface NormParams {
  featureMins: number[];
  featureMaxs: number[];
  epsMin: number;
  epsMax: number;
}

function getNormParams(): NormParams | null {
  const raw = localStorage.getItem(MODEL_URL + ":norm")
    ?? localStorage.getItem("localstorage://valulens-ml-v2:norm");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function loadModel(): Promise<tf.LayersModel | null> {
  // Try IndexedDB first, then localStorage
  const urls = [MODEL_URL, "localstorage://valulens-ml-v2"];
  for (const url of urls) {
    try {
      const model = await tf.loadLayersModel(url);
      model.compile({
        optimizer: tf.train.adam(0.005),
        loss: "meanSquaredError",
        metrics: ["mae"],
      });
      return model;
    } catch {
      continue;
    }
  }
  return null;
}

export function predictEPSGrowth(
  model: tf.LayersModel,
  epsHistory: number[],
  roe: number,
  der: number,
  dividendYield: number = 0
): MLPrediction {
  if (epsHistory.length < SEQUENCE_LENGTH) {
    return { predictedGrowthRate: 0, confidence: 0, nextYearEPS: 0, predictedROE: roe };
  }

  const norm = getNormParams();

  // Build feature rows: [eps, roe, der, dividendYield] for each year
  const featureRows: number[][] = epsHistory.map((eps) => [
    eps,
    roe,
    der,
    dividendYield,
  ]);

  let normalizedSequence: number[][];

  if (norm) {
    // Use saved normalization params
    normalizedSequence = featureRows.map((row) =>
      row.map((v, c) => {
        const range = norm.featureMaxs[c] - norm.featureMins[c] || 1;
        return (v - norm.featureMins[c]) / range;
      })
    );
  } else {
    // Fallback: normalize just the input
    const { normalized } = normalizeMulti(featureRows);
    normalizedSequence = normalized;
  }

  const lastSeq = normalizedSequence.slice(-SEQUENCE_LENGTH);

  // Flatten for tensor: [1, SEQUENCE_LENGTH, NUM_FEATURES]
  const flatInput: number[] = [];
  for (const row of lastSeq) {
    for (const val of row) {
      flatInput.push(val);
    }
  }

  const inputTensor = tf.tensor3d(flatInput, [1, SEQUENCE_LENGTH, NUM_FEATURES]);
  const prediction = model.predict(inputTensor) as tf.Tensor;
  const predictedValue = prediction.dataSync()[0];

  inputTensor.dispose();
  prediction.dispose();

  // Denormalize EPS
  let nextYearEPS: number;
  if (norm) {
    const epsRange = norm.epsMax - norm.epsMin || 1;
    nextYearEPS = predictedValue * epsRange + norm.epsMin;
  } else {
    const { min, max } = normalize(epsHistory);
    const range = max - min || 1;
    nextYearEPS = predictedValue * range + min;
  }

  const currentEPS = epsHistory[epsHistory.length - 1];
  const predictedGrowthRate = currentEPS > 0
    ? (nextYearEPS - currentEPS) / currentEPS
    : 0;

  // Confidence based on historical volatility
  const growthRates: number[] = [];
  for (let i = 1; i < epsHistory.length; i++) {
    if (epsHistory[i - 1] > 0) {
      growthRates.push(Math.abs((epsHistory[i] - epsHistory[i - 1]) / epsHistory[i - 1]));
    }
  }
  const avgVolatility = growthRates.length > 0
    ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
    : 0.5;
  const confidence = Math.max(0, Math.min(1, 1 - avgVolatility * 0.8));

  const cappedGrowthRate = Math.max(-0.30, Math.min(0.30, predictedGrowthRate));

  return {
    predictedGrowthRate: Math.round(cappedGrowthRate * 10000) / 100,
    confidence: Math.round(confidence * 100) / 100,
    nextYearEPS: Math.round(nextYearEPS * 100) / 100,
    predictedROE: roe,
  };
}

export async function hasSavedModel(): Promise<boolean> {
  const urls = [MODEL_URL, "localstorage://valulens-ml-v2"];
  for (const url of urls) {
    try {
      const models = await tf.io.listModels();
      if (models[url]) return true;
    } catch {
      // ignore
    }
  }
  // Also check if norm params exist (companion data)
  return getNormParams() !== null;
}

export async function deleteSavedModel(): Promise<void> {
  const urls = [MODEL_URL, "localstorage://valulens-ml-v2"];
  for (const url of urls) {
    try {
      await tf.io.removeModel(url);
    } catch {
      // ignore
    }
  }
  localStorage.removeItem(MODEL_URL + ":norm");
  localStorage.removeItem("localstorage://valulens-ml-v2:norm");
}
