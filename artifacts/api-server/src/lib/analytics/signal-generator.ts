import { computeTechnical } from "./technical.js";
import { computeEconophysics } from "./econophysics.js";
import { computeMarketState } from "./market-state.js";
import { runMonteCarlo } from "./monte-carlo.js";
import { getBayesianPriors, computeBayesianScore } from "./bayesian.js";
import { computeMLScore } from "./ml-model.js";
import { db } from "@workspace/db";
import { signalsTable } from "@workspace/db/schema";

export interface ScoreBreakdown {
  priceAction: number;
  marketStructure: number;
  technicalIndicators: number;
  monteCarlo: number;
  bayesian: number;
  machineLearning: number;
  econophysics: number;
  marketRegime: number;
}

const WEIGHTS = {
  priceAction: 0.12,
  marketStructure: 0.15,
  technicalIndicators: 0.18,
  monteCarlo: 0.15,
  bayesian: 0.12,
  machineLearning: 0.14,
  econophysics: 0.10,
  marketRegime: 0.04,
};

function computeTotalScore(breakdown: ScoreBreakdown): number {
  return Math.round(
    breakdown.priceAction * WEIGHTS.priceAction +
    breakdown.marketStructure * WEIGHTS.marketStructure +
    breakdown.technicalIndicators * WEIGHTS.technicalIndicators +
    breakdown.monteCarlo * WEIGHTS.monteCarlo +
    breakdown.bayesian * WEIGHTS.bayesian +
    breakdown.machineLearning * WEIGHTS.machineLearning +
    breakdown.econophysics * WEIGHTS.econophysics +
    breakdown.marketRegime * WEIGHTS.marketRegime
  );
}

function priceActionScore(patterns: string[], direction: string): number {
  let score = 40;
  const bullish = patterns.filter(p => p.toLowerCase().includes("bullish")).length;
  const bearish = patterns.filter(p => p.toLowerCase().includes("bearish")).length;
  const neutral = patterns.length - bullish - bearish;

  if (direction === "long") {
    score += bullish * 20 - bearish * 15 + neutral * 5;
  } else {
    score += bearish * 20 - bullish * 15 + neutral * 5;
  }
  return Math.max(0, Math.min(100, score));
}

function marketStructureScore(
  direction: string,
  supportLevels: number[],
  resistanceLevels: number[],
  currentPrice: number,
  liquidityZones: number[]
): number {
  let score = 40;

  const nearSupport = supportLevels.some(s => Math.abs(currentPrice - s) / currentPrice < 0.002);
  const nearResistance = resistanceLevels.some(r => Math.abs(currentPrice - r) / currentPrice < 0.002);
  const nearLiquidity = liquidityZones.some(z => Math.abs(currentPrice - z) / currentPrice < 0.001);

  if (direction === "long") {
    if (nearSupport) score += 25;
    if (nearResistance) score -= 15;
  } else {
    if (nearResistance) score += 25;
    if (nearSupport) score -= 15;
  }
  if (nearLiquidity) score += 10;

  return Math.max(0, Math.min(100, score));
}

function technicalScore(rsi: number, emaSignal: string, bbPercentB: number, direction: string): number {
  let score = 40;
  if (direction === "long") {
    if (rsi < 30) score += 25;
    else if (rsi < 45) score += 10;
    else if (rsi > 70) score -= 20;
    if (emaSignal === "bullish") score += 15;
    else if (emaSignal === "bearish") score -= 15;
    if (bbPercentB < 0.2) score += 10;
    else if (bbPercentB > 0.8) score -= 10;
  } else {
    if (rsi > 70) score += 25;
    else if (rsi > 55) score += 10;
    else if (rsi < 30) score -= 20;
    if (emaSignal === "bearish") score += 15;
    else if (emaSignal === "bullish") score -= 15;
    if (bbPercentB > 0.8) score += 10;
    else if (bbPercentB < 0.2) score -= 10;
  }
  return Math.max(0, Math.min(100, score));
}

function monteCarloScore(probUp: number, probDown: number, direction: string): number {
  const prob = direction === "long" ? probUp : probDown;
  return Math.round(prob * 100);
}

function econophysicsScore(hurst: number, entropy: number, zScore: number, liquidityShock: number): number {
  let score = 50;
  if (hurst > 0.6) score += 15;
  else if (hurst < 0.4) score -= 10;
  if (entropy > 0.8) score -= 10;
  if (Math.abs(zScore) > 2) score += 10;
  if (liquidityShock > 3) score += 10;
  return Math.max(0, Math.min(100, score));
}

function marketRegimeScore(regime: string, direction: string): number {
  const map: Record<string, Record<string, number>> = {
    trending_up: { long: 80, short: 30 },
    trending_down: { long: 30, short: 80 },
    ranging: { long: 55, short: 55 },
    volatile: { long: 45, short: 45 },
    breakout: { long: 65, short: 65 },
  };
  return map[regime]?.[direction] ?? 50;
}

function computeEntryLevels(currentPrice: number, direction: string, support: number[], resistance: number[]) {
  const pipSize = 0.0001;
  if (direction === "long") {
    const nearestSupport = support.filter(s => s < currentPrice).sort((a, b) => b - a)[0];
    const entry1 = currentPrice;
    const entry2 = nearestSupport ?? currentPrice - 10 * pipSize;
    const sl1 = entry2 - 15 * pipSize;
    const sl2 = sl1 - 10 * pipSize;
    const nearestResistance = resistance.filter(r => r > currentPrice).sort((a, b) => a - b)[0];
    const tp1 = nearestResistance ?? currentPrice + 20 * pipSize;
    const tp2 = tp1 + 20 * pipSize;
    return { entry1, entry2, sl1, sl2, tp1, tp2 };
  } else {
    const nearestResistance = resistance.filter(r => r > currentPrice).sort((a, b) => a - b)[0];
    const entry1 = currentPrice;
    const entry2 = nearestResistance ?? currentPrice + 10 * pipSize;
    const sl1 = entry2 + 15 * pipSize;
    const sl2 = sl1 + 10 * pipSize;
    const nearestSupport = support.filter(s => s < currentPrice).sort((a, b) => b - a)[0];
    const tp1 = nearestSupport ?? currentPrice - 20 * pipSize;
    const tp2 = tp1 - 20 * pipSize;
    return { entry1, entry2, sl1, sl2, tp1, tp2 };
  }
}

function buildRationale(direction: string, breakdown: ScoreBreakdown, patterns: string[], regime: string): string {
  const parts: string[] = [];
  parts.push(`${direction.toUpperCase()} signal in ${regime.replace("_", " ")} regime.`);
  if (patterns.length > 0) parts.push(`Price action: ${patterns.slice(0, 2).join(", ")}.`);
  if (breakdown.technicalIndicators > 60) parts.push("Technical indicators confirm direction.");
  if (breakdown.monteCarlo > 60) parts.push(`Monte Carlo probability: ${breakdown.monteCarlo.toFixed(0)}%.`);
  if (breakdown.bayesian > 60) parts.push(`Bayesian posterior: ${breakdown.bayesian.toFixed(0)}%.`);
  if (breakdown.machineLearning > 65) parts.push("ML model confirms pattern.");
  if (breakdown.econophysics > 65) parts.push("Econophysics metrics support setup.");
  return parts.join(" ");
}

let lastSignalTime = 0;
const SIGNAL_COOLDOWN_MS = 5 * 60 * 1000;

export async function generateSignalIfNeeded(prices: number[]): Promise<void> {
  if (prices.length < 20) return;
  const now = Date.now();
  if (now - lastSignalTime < SIGNAL_COOLDOWN_MS) return;

  const currentPrice = prices[prices.length - 1]!;
  const tech = computeTechnical(prices);
  const econ = computeEconophysics(prices);
  const mktState = computeMarketState(prices);
  const mc = runMonteCarlo(prices, 500);
  const priors = await getBayesianPriors();

  const direction: "long" | "short" = mc.probabilityUp >= 0.5 ? "long" : "short";

  const mlFeatures = {
    rsi: tech.rsi,
    momentum: tech.momentum,
    volatility: tech.volatility,
    hurstExponent: econ.hurstExponent,
    zScore: econ.zScore,
    bbPercentB: tech.bollingerBands.percentB,
    priceAcceleration: econ.priceAcceleration,
    marketEntropy: econ.marketEntropy,
    liquidityShock: econ.liquidityShock,
    fatTailIndex: econ.fatTailIndex,
  };

  const breakdown: ScoreBreakdown = {
    priceAction: priceActionScore(tech.priceActionPatterns, direction),
    marketStructure: marketStructureScore(direction, mktState.supportLevels, mktState.resistanceLevels, currentPrice, mktState.liquidityZones),
    technicalIndicators: technicalScore(tech.rsi, tech.emaSignal, tech.bollingerBands.percentB, direction),
    monteCarlo: monteCarloScore(mc.probabilityUp, mc.probabilityDown, direction),
    bayesian: computeBayesianScore(direction, priors, tech.rsi, tech.emaSignal, tech.priceActionPatterns),
    machineLearning: computeMLScore(mlFeatures, direction),
    econophysics: econophysicsScore(econ.hurstExponent, econ.marketEntropy, econ.zScore, econ.liquidityShock),
    marketRegime: marketRegimeScore(mktState.regime, direction),
  };

  const totalScore = computeTotalScore(breakdown);
  if (totalScore < 45) return;

  const levels = computeEntryLevels(currentPrice, direction, mktState.supportLevels, mktState.resistanceLevels);
  const rationale = buildRationale(direction, breakdown, tech.priceActionPatterns, mktState.regime);

  try {
    await db.insert(signalsTable).values({
      direction,
      entry1: levels.entry1,
      entry2: levels.entry2,
      stopLoss1: levels.sl1,
      stopLoss2: levels.sl2,
      takeProfit1: levels.tp1,
      takeProfit2: levels.tp2,
      score: totalScore,
      scoreBreakdown: breakdown,
      rationale,
      status: "active",
    });
    lastSignalTime = now;
  } catch {}
}
