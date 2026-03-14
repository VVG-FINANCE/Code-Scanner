export interface TechnicalResult {
  rsi: number;
  rsiSignal: string;
  ema20: number;
  ema50: number;
  ema200: number;
  emaSignal: string;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    percentB: number;
  };
  momentum: number;
  volatility: number;
  priceActionPatterns: string[];
}

function ema(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  const k = 2 / (period + 1);
  let emaVal = prices[0]!;
  for (let i = 1; i < prices.length; i++) {
    emaVal = prices[i]! * k + emaVal * (1 - k);
  }
  return emaVal;
}

function rsi(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i]! - prices[i - 1]!;
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function bollingerBands(prices: number[], period = 20, multiplier = 2) {
  const slice = prices.slice(-period);
  if (slice.length < 2) {
    const p = prices[prices.length - 1] ?? 1.085;
    return { upper: p + 0.002, middle: p, lower: p - 0.002, bandwidth: 0.004, percentB: 0.5 };
  }
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  const std = Math.sqrt(variance);
  const upper = mean + multiplier * std;
  const lower = mean - multiplier * std;
  const bandwidth = (upper - lower) / mean;
  const current = prices[prices.length - 1] ?? mean;
  const percentB = (upper - lower) > 0 ? (current - lower) / (upper - lower) : 0.5;
  return { upper, middle: mean, lower, bandwidth, percentB };
}

function detectPriceActionPatterns(prices: number[]): string[] {
  const patterns: string[] = [];
  if (prices.length < 5) return patterns;

  const n = prices.length;
  const o = prices[n - 2]!;
  const c = prices[n - 1]!;
  const prevO = prices[n - 3]!;
  const prevC = prices[n - 2]!;

  const body = Math.abs(c - o);
  const prevBody = Math.abs(prevC - prevO);

  if (body > prevBody * 1.5) {
    if (c > o && prevC < prevO) patterns.push("Bullish Engulfing");
    if (c < o && prevC > prevO) patterns.push("Bearish Engulfing");
  }

  const high = Math.max(o, c);
  const low = Math.min(o, c);
  const prevHigh = Math.max(prevO, prevC);
  const prevLow = Math.min(prevO, prevC);
  if (high < prevHigh && low > prevLow) patterns.push("Inside Bar");

  const range = Math.max(...prices.slice(-3)) - Math.min(...prices.slice(-3));
  if (body < range * 0.3) {
    if (c > o) patterns.push("Bullish Pin Bar");
    else patterns.push("Bearish Pin Bar");
  }

  const recentHigh = Math.max(...prices.slice(-10, -1));
  const recentLow = Math.min(...prices.slice(-10, -1));
  if (c > recentHigh * 0.9995) patterns.push("Resistance Breakout");
  if (c < recentLow * 1.0005) patterns.push("Support Breakout");

  return patterns;
}

export function computeTechnical(prices: number[]): TechnicalResult {
  if (prices.length < 10) {
    const p = prices[prices.length - 1] ?? 1.0850;
    return {
      rsi: 50,
      rsiSignal: "neutral",
      ema20: p,
      ema50: p,
      ema200: p,
      emaSignal: "neutral",
      bollingerBands: { upper: p + 0.002, middle: p, lower: p - 0.002, bandwidth: 0.003, percentB: 0.5 },
      momentum: 0,
      volatility: 0.0002,
      priceActionPatterns: [],
    };
  }

  const rsiVal = rsi(prices);
  const rsiSignal = rsiVal > 70 ? "overbought" : rsiVal < 30 ? "oversold" : "neutral";

  const ema20 = ema(prices.slice(-50), 20);
  const ema50 = ema(prices.slice(-100), 50);
  const ema200 = ema(prices, 200);

  const emaSignal = ema20 > ema50 && ema50 > ema200 ? "bullish" : ema20 < ema50 && ema50 < ema200 ? "bearish" : "neutral";

  const bb = bollingerBands(prices);

  const recent = prices.slice(-10);
  const momentum = ((recent[recent.length - 1]! - recent[0]!) / recent[0]!) * 10000;

  const diffs = prices.slice(-20).map((p, i, arr) => i > 0 ? Math.abs(p - arr[i - 1]!) : 0).slice(1);
  const volatility = diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0.0001;

  const patterns = detectPriceActionPatterns(prices);

  return { rsi: rsiVal, rsiSignal, ema20, ema50, ema200, emaSignal, bollingerBands: bb, momentum, volatility, priceActionPatterns: patterns };
}
