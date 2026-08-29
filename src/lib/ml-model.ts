import * as tf from "@tensorflow/tfjs";

export interface TrainingStock {
  ticker: string;
  epsHistory: number[];
  roe: number;
  der: number;
}

export interface MLPrediction {
  predictedGrowthRate: number;
  confidence: number;
  nextYearEPS: number;
}

const SEQUENCE_LENGTH = 3;
const MODEL_KEY = "valulens:ml-model";

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

function createSequences(epsHistories: number[][]): { xs: number[][][]; ys: number[] } {
  const xs: number[][][] = [];
  const ys: number[] = [];

  for (const history of epsHistories) {
    if (history.length < SEQUENCE_LENGTH + 1) continue;

    const { normalized } = normalize(history);

    for (let i = 0; i <= normalized.length - SEQUENCE_LENGTH - 1; i++) {
      const seq = normalized.slice(i, i + SEQUENCE_LENGTH);
      const nextVal = normalized[i + SEQUENCE_LENGTH];
      xs.push([seq]);
      ys.push(nextVal);
    }
  }

  return { xs, ys };
}

function buildModel(): tf.LayersModel {
  const model = tf.sequential();

  model.add(tf.layers.lstm({
    units: 32,
    inputShape: [SEQUENCE_LENGTH, 1],
    returnSequences: false,
  }));

  model.add(tf.layers.dropout({ rate: 0.2 }));

  model.add(tf.layers.dense({ units: 16, activation: "relu" }));

  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: "meanSquaredError",
    metrics: ["mae"],
  });

  return model;
}

function prepareTrainingData(stocks: TrainingStock[]): {
  features: tf.Tensor4D;
  labels: tf.Tensor2D;
  normalizationParams: { min: number; max: number }[];
} {
  const allHistories = stocks.map((s) => s.epsHistory);
  const { xs, ys } = createSequences(allHistories);

  const normalizationParams = allHistories.map((h) => normalize(h));

  // Flatten xs to a flat number array for tensor4d
  const flatData: number[] = [];
  for (const x of xs) {
    for (const seq of x) {
      for (const val of seq) {
        flatData.push(val);
      }
    }
  }

  const featuresTensor = tf.tensor3d(
    flatData,
    [xs.length, SEQUENCE_LENGTH, 1]
  );

  const labelsTensor = tf.tensor2d(ys, [ys.length, 1]);

  return { features: featuresTensor, labels: labelsTensor, normalizationParams };
}

export async function trainModel(
  stocks: TrainingStock[],
  onProgress?: (epoch: number, loss: number) => void
): Promise<tf.LayersModel> {
  const { features, labels } = prepareTrainingData(stocks);

  const model = buildModel();

  await model.fit(features, labels, {
    epochs: 50,
    batchSize: 16,
    shuffle: true,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        onProgress?.(epoch + 1, logs?.loss ?? 0);
      },
    },
  });

  // Save model to localStorage
  await model.save(`localstorage://${MODEL_KEY}`);

  // Cleanup tensors
  features.dispose();
  labels.dispose();

  return model;
}

export async function loadModel(): Promise<tf.LayersModel | null> {
  try {
    const model = await tf.loadLayersModel(`localstorage://${MODEL_KEY}`);
    model.compile({
      optimizer: tf.train.adam(0.01),
      loss: "meanSquaredError",
      metrics: ["mae"],
    });
    return model;
  } catch {
    return null;
  }
}

export function predictEPSGrowth(
  model: tf.LayersModel,
  epsHistory: number[],
  roe: number,
  der: number
): MLPrediction {
  if (epsHistory.length < SEQUENCE_LENGTH) {
    return { predictedGrowthRate: 0, confidence: 0, nextYearEPS: 0 };
  }

  const { normalized, min, max } = normalize(epsHistory);
  const sequence = normalized.slice(-SEQUENCE_LENGTH);

  const inputTensor = tf.tensor3d(
    sequence,
    [1, SEQUENCE_LENGTH, 1]
  );

  const prediction = model.predict(inputTensor) as tf.Tensor;
  const predictedValue = prediction.dataSync()[0];

  inputTensor.dispose();
  prediction.dispose();

  // Denormalize
  const range = max - min || 1;
  const nextYearEPS = predictedValue * range + min;

  // Calculate growth rate
  const currentEPS = epsHistory[epsHistory.length - 1];
  const predictedGrowthRate = currentEPS > 0
    ? (nextYearEPS - currentEPS) / currentEPS
    : 0;

  // Simple confidence based on historical volatility
  const growthRates: number[] = [];
  for (let i = 1; i < epsHistory.length; i++) {
    if (epsHistory[i - 1] > 0) {
      growthRates.push(Math.abs((epsHistory[i] - epsHistory[i - 1]) / epsHistory[i - 1]));
    }
  }
  const avgVolatility = growthRates.length > 0
    ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
    : 0.5;
  const confidence = Math.max(0, Math.min(1, 1 - avgVolatility));

  // Cap growth rate at reasonable bounds
  const cappedGrowthRate = Math.max(-0.30, Math.min(0.30, predictedGrowthRate));

  return {
    predictedGrowthRate: Math.round(cappedGrowthRate * 10000) / 100,
    confidence: Math.round(confidence * 100) / 100,
    nextYearEPS: Math.round(nextYearEPS * 100) / 100,
  };
}

export function hasSavedModel(): boolean {
  return localStorage.getItem(MODEL_KEY) !== null;
}
