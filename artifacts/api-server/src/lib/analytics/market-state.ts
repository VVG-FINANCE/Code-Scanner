export type MarketRegime = "trending_up" | "trending_down" | "ranging" | "volatile" | "breakout";

export interface MarketStateResult {
  regime: MarketRegime;
  strength: number;
  supportLevels: number[];
  resistanceLevels: number[];
  liquidityZones: number[];
}

function findKeyLevels(prices: number[]): { support: number[]; resistance: number[] } {
  if (prices.length < 10) {
    const p = prices[prices.length - 1] ?? 1.085;
    return { support: [p - 0.005, p - 0.010], resistance: [p + 0.005, p + 0.010] };
  }

  const windowSize = Math.min(20, Math.floor(prices.length / 3));
  const pivotHighs: number[] = [];
  const pivotLows: number[] = [];

  for (let i = windowSize; i < prices.length - windowSize; i++) {
    const window = prices.slice(i - windowSize, i + windowSize + 1);
    const max = Math.max(...window);
    const min = Math.min(...window);
    if (prices[i] === max) pivotHighs.push(prices[i]!);
    if (prices[i] === min) pivotLows.push(prices[i]!);
  }

  const uniqueRes = [...new Set(pivotHighs.slice(-5).map(p => Math.round(p * 10000) / 10000))].slice(-3);
  const uniqueSup = [...new Set(pivotLows.slice(-5).map(p => Math.round(p * 10000) / 10000))].slice(-3);

  const current = prices[prices.length - 1] ?? 1.085;
  if (uniqueRes.length === 0) uniqueRes.push(current + 0.005, current + 0.010);
  if (uniqueSup.length === 0) uniqueSup.push(current - 0.005, current - 0.010);

  return { support: uniqueSup, resistance: uniqueRes };
}

function findLiquidityZones(prices: number[]): number[] {
  if (prices.length < 20) {
    const p = prices[prices.length - 1] ?? 1.085;
    return [p - 0.002, p + 0.002];
  }

  const slice = prices.slice(-50);
  const roundLevels = new Map<number, number>();
  slice.forEach(p => {
    const rounded = Math.round(p * 1000) / 1000;
    roundLevels.set(rounded, (roundLevels.get(rounded) ?? 0) + 1);
  });

  const sorted = [...roundLevels.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 4).map(([level]) => level);
}

export function computeMarketState(prices: number[]): MarketStateResult {
  if (prices.length < 10) {
    const p = prices[prices.length - 1] ?? 1.085;
    return {
      regime: "ranging",
      strength: 0.5,
      supportLevels: [p - 0.005, p - 0.010],
      resistanceLevels: [p + 0.005, p + 0.010],
      liquidityZones: [p - 0.002, p + 0.002],
    };
  }

  const recent = prices.slice(-50);
  const firstHalf = recent.slice(0, 25);
  const secondHalf = recent.slice(25);

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const trendStrength = Math.abs(secondAvg - firstAvg) / firstAvg * 10000;

  const high = Math.max(...recent);
  const low = Math.min(...recent);
  const range = high - low;
  const avgPrice = recent.reduce((a, b) => a + b, 0) / recent.length;

  const diffs = recent.map((p, i) => i > 0 ? Math.abs(p - recent[i - 1]!) : 0).slice(1);
  const avgMove = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const lastMove = diffs[diffs.length - 1] ?? 0;

  let regime: MarketRegime;
  let strength: number;

  if (lastMove > avgMove * 3) {
    regime = "breakout";
    strength = Math.min(1, lastMove / avgMove / 5);
  } else if (trendStrength > 10) {
    regime = secondAvg > firstAvg ? "trending_up" : "trending_down";
    strength = Math.min(1, trendStrength / 30);
  } else if (range / avgPrice * 10000 > 20) {
    regime = "volatile";
    strength = Math.min(1, (range / avgPrice * 10000) / 50);
  } else {
    regime = "ranging";
    strength = 1 - Math.min(1, trendStrength / 10);
  }

  const { support, resistance } = findKeyLevels(prices);
  const liquidityZones = findLiquidityZones(prices);

  return { regime, strength, supportLevels: support, resistanceLevels: resistance, liquidityZones };
}
