import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { signalsTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { getPriceBuffer } from "../lib/market-data.js";
import { generateSignalIfNeeded } from "../lib/analytics/signal-generator.js";
import { updateBayesianPriors } from "../lib/analytics/bayesian.js";
import { getCurrentPrice } from "../lib/market-data.js";
import {
  GetSignalsResponse,
  GetSignalHistoryResponse,
  ResolveSignalBody,
  ResolveSignalResponse,
  ResolveSignalParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatSignal(row: typeof signalsTable.$inferSelect) {
  return {
    id: row.id,
    direction: row.direction as "long" | "short",
    entry1: row.entry1,
    entry2: row.entry2 ?? undefined,
    stopLoss1: row.stopLoss1,
    stopLoss2: row.stopLoss2 ?? undefined,
    takeProfit1: row.takeProfit1,
    takeProfit2: row.takeProfit2 ?? undefined,
    score: row.score,
    scoreBreakdown: row.scoreBreakdown as {
      priceAction: number;
      marketStructure: number;
      technicalIndicators: number;
      monteCarlo: number;
      bayesian: number;
      machineLearning: number;
      econophysics: number;
      marketRegime: number;
    },
    rationale: row.rationale,
    status: row.status as "active" | "tp1_hit" | "tp2_hit" | "sl1_hit" | "sl2_hit" | "expired",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/", async (_req, res) => {
  const prices = getPriceBuffer().map(b => b.price);
  await generateSignalIfNeeded(prices);

  const currentPrice = getCurrentPrice();
  const activeSignals = await db
    .select()
    .from(signalsTable)
    .where(eq(signalsTable.status, "active"))
    .orderBy(desc(signalsTable.createdAt))
    .limit(10);

  const signals = activeSignals.map(formatSignal);
  const parsed = GetSignalsResponse.parse({
    signals,
    currentPrice: currentPrice.adjustedPrice,
    generatedAt: new Date().toISOString(),
  });
  res.json(parsed);
});

router.get("/history", async (req, res) => {
  const limit = Number(req.query["limit"]) || 20;
  const rows = await db
    .select()
    .from(signalsTable)
    .orderBy(desc(signalsTable.createdAt))
    .limit(Math.min(limit, 100));

  const signals = rows.map(formatSignal);
  const parsed = GetSignalHistoryResponse.parse({ signals, total: signals.length });
  res.json(parsed);
});

router.post("/:id/resolve", async (req, res) => {
  const { id } = ResolveSignalParams.parse({ id: req.params["id"] });
  const body = ResolveSignalBody.parse(req.body);

  const [updated] = await db
    .update(signalsTable)
    .set({ status: body.outcome, updatedAt: new Date() })
    .where(eq(signalsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Signal not found" });
    return;
  }

  await updateBayesianPriors(updated.direction, body.outcome);

  const parsed = ResolveSignalResponse.parse({ success: true, signal: formatSignal(updated) });
  res.json(parsed);
});

export default router;
