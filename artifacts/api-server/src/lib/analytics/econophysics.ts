export interface EconophysicsResult {
  hurstExponent: number;
  hurstInterpretation: string;
  marketEntropy: number;
  volatilityClustering: number;
  liquidityShock: number;
  priceAcceleration: number;
  fatTailIndex: number;
  zScore: number;
}

function hurstExponent(prices: number[]): number {
  if (prices.length < 20) return 0.5;
  const n = Math.min(prices.length, 200);
  const series = prices.slice(-n);
  const returns = series.map((p, i) => i > 0 ? Math.log(p / series[i - 1]!) : 0).slice(1);

  const lags = [2, 4, 8, 16, 32].filter(l => l < returns.length / 2);
  const logLags: number[] = [];
  const logRS: number[] = [];

  for (const lag of lags) {
    const chunks: number[][] = [];
    for (let i = 0; i + lag <= returns.length; i += lag) {
      chunks.push(returns.slice(i, i + lag));
    }
    const rsValues = chunks.map(chunk => {
      const mean = chunk.reduce((a, b) => a + b, 0) / chunk.length;
      const cumdev = chunk.map((_, i) => chunk.slice(0, i + 1).reduce((a, b) => a + b, 0) - mean * (i + 1));
      const range = Math.max(...cumdev) - Math.min(...cumdev);
      const std = Math.sqrt(chunk.reduce((a, b) => a + (b - mean) ** 2, 0) / chunk.length) || 0.0001;
      return range / std;
    });
    const avgRS = rsValues.reduce((a, b) => a + b, 0) / rsValues.length;
    logLags.push(Math.log(lag));
    logRS.push(Math.log(avgRS));
  }

  if (logLags.length < 2) return 0.5;
  const n2 = logLags.length;
  const sumX = logLags.reduce((a, b) => a + b, 0);
  const sumY = logRS.reduce((a, b) => a + b, 0);
  const sumXY = logLags.reduce((a, b, i) => a + b * logRS[i]!, 0);
  const sumX2 = logLags.reduce((a, b) => a + b * b, 0);
  const slope = (n2 * sumXY - sumX * sumY) / (n2 * sumX2 - sumX * sumX);
  return Math.max(0.01, Math.min(0.99, slope));
}

function shannonEntropy(prices: number[]): number {
  if (prices.length < 10) return 1.0;
  const returns = prices.slice(-50).map((p, i, arr) => i > 0 ? ((p - arr[i - 1]!) / arr[i - 1]! * 10000) : 0).slice(1);
  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const range = max - min || 0.0001;
  const bins = 10;
  const freq = new Array(bins).fill(0) as number[];
  returns.forEach(r => {
    const bin = Math.min(bins - 1, Math.floor(((r - min) / range) * bins));
    freq[bin]!++;
  });
  const total = returns.length;
  const entropy = freq.reduce((acc, f) => {
    if (f === 0) return acc;
    const p = f / total;
    return acc - p * Math.log2(p);
  }, 0);
  return entropy / Math.log2(bins);
}

function volatilityClustering(prices: number[]): number {
  if (prices.length < 20) return 0;
  const returns = prices.slice(-50).map((p, i, arr) => i > 0 ? Math.abs((p - arr[i - 1]!) / arr[i - 1]!) : 0).slice(1);
  if (returns.length < 4) return 0;
  const n = returns.length;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  let cov = 0, varA = 0;
  for (let i = 0; i < n - 1; i++) {
    cov += (returns[i]! - mean) * (returns[i + 1]! - mean);
    varA += (returns[i]! - mean) ** 2;
  }
  return varA > 0 ? cov / varA : 0;
}

function liquidityShock(prices: number[]): number {
  if (prices.length < 10) return 0;
  const recent = prices.slice(-10);
  const returns = recent.map((p, i) => i > 0 ? Math.abs((p - recent[i - 1]!) / recent[i - 1]!) : 0).slice(1);
  const avg = returns.slice(0, -1).reduce((a, b) => a + b, 0) / Math.max(1, returns.length - 1) || 0.0001;
  const last = returns[returns.length - 1] ?? 0;
  return Math.min(10, last / avg);
}

function priceAcceleration(prices: number[]): number {
  if (prices.length < 5) return 0;
  const recent = prices.slice(-5);
  const v1 = recent[2]! - recent[1]!;
  const v2 = recent[3]! - recent[2]!;
  const v3 = recent[4]! - recent[3]!;
  const a1 = v2 - v1;
  const a2 = v3 - v2;
  return (a2 - a1) * 10000;
}

function fatTailIndex(prices: number[]): number {
  if (prices.length < 20) return 3.0;
  const returns = prices.slice(-100).map((p, i, arr) => i > 0 ? (p - arr[i - 1]!) / arr[i - 1]! : 0).slice(1);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const std = Math.sqrt(variance) || 0.0001;
  const kurtosis = returns.reduce((a, b) => a + ((b - mean) / std) ** 4, 0) / returns.length;
  return kurtosis;
}

function zScore(prices: number[]): number {
  if (prices.length < 20) return 0;
  const slice = prices.slice(-20);
  const current = slice[slice.length - 1]!;
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length) || 0.0001;
  return (current - mean) / std;
}

export function computeEconophysics(prices: number[]): EconophysicsResult {
  const h = hurstExponent(prices);
  const hurstInterpretation = h > 0.6 ? "trending (persistent)" : h < 0.4 ? "mean-reverting (anti-persistent)" : "random walk";

  return {
    hurstExponent: h,
    hurstInterpretation,
    marketEntropy: shannonEntropy(prices),
    volatilityClustering: volatilityClustering(prices),
    liquidityShock: liquidityShock(prices),
    priceAcceleration: priceAcceleration(prices),
    fatTailIndex: fatTailIndex(prices),
    zScore: zScore(prices),
  };
}
