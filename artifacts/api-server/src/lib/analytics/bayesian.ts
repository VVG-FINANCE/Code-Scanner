import { db } from "@workspace/db";
import { bayesianStateTable } from "@workspace/db/schema";

export interface BayesianState {
  priorLong: number;
  priorShort: number;
  likelihoodLong: number;
  likelihoodShort: number;
  posteriorLong: number;
  posteriorShort: number;
}

export async function getBayesianPriors(): Promise<{ priorLong: number; priorShort: number }> {
  try {
    const [row] = await db.select().from(bayesianStateTable).limit(1);
    if (row) {
      return { priorLong: row.priorLong, priorShort: row.priorShort };
    }
  } catch {}
  return { priorLong: 0.5, priorShort: 0.5 };
}

export async function updateBayesianPriors(direction: string, outcome: string): Promise<void> {
  try {
    const [row] = await db.select().from(bayesianStateTable).limit(1);
    if (!row) {
      await db.insert(bayesianStateTable).values({
        priorLong: 0.5,
        priorShort: 0.5,
        totalSignals: 1,
        successfulLong: direction === "long" && outcome.startsWith("tp") ? 1 : 0,
        successfulShort: direction === "short" && outcome.startsWith("tp") ? 1 : 0,
      });
      return;
    }

    const newTotalSignals = row.totalSignals + 1;
    const newSuccessfulLong = row.successfulLong + (direction === "long" && outcome.startsWith("tp") ? 1 : 0);
    const newSuccessfulShort = row.successfulShort + (direction === "short" && outcome.startsWith("tp") ? 1 : 0);

    const priorLong = newTotalSignals > 0 ? newSuccessfulLong / newTotalSignals : 0.5;
    const priorShort = newTotalSignals > 0 ? newSuccessfulShort / newTotalSignals : 0.5;

    await db.update(bayesianStateTable).set({
      priorLong: Math.max(0.1, Math.min(0.9, priorLong)),
      priorShort: Math.max(0.1, Math.min(0.9, priorShort)),
      totalSignals: newTotalSignals,
      successfulLong: newSuccessfulLong,
      successfulShort: newSuccessfulShort,
      updatedAt: new Date(),
    });
  } catch {}
}

export function computeBayesianScore(
  direction: string,
  priors: { priorLong: number; priorShort: number },
  rsi: number,
  emaSignal: string,
  patterns: string[]
): number {
  const prior = direction === "long" ? priors.priorLong : priors.priorShort;

  let likelihoodBull = 0.5;
  if (rsi < 30) likelihoodBull += 0.2;
  else if (rsi > 70) likelihoodBull -= 0.2;
  if (emaSignal === "bullish") likelihoodBull += 0.1;
  else if (emaSignal === "bearish") likelihoodBull -= 0.1;
  if (patterns.some(p => p.toLowerCase().includes("bullish"))) likelihoodBull += 0.1;
  if (patterns.some(p => p.toLowerCase().includes("bearish"))) likelihoodBull -= 0.1;

  const likelihood = direction === "long" ? likelihoodBull : 1 - likelihoodBull;
  const posterior = (prior * likelihood) / (prior * likelihood + (1 - prior) * (1 - likelihood));
  return Math.max(0, Math.min(100, posterior * 100));
}
