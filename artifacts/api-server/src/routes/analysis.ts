import { Router, type IRouter } from "express";
import { getPriceBuffer } from "../lib/market-data.js";
import { computeTechnical } from "../lib/analytics/technical.js";
import { computeEconophysics } from "../lib/analytics/econophysics.js";
import { computeMarketState } from "../lib/analytics/market-state.js";
import { runMonteCarlo } from "../lib/analytics/monte-carlo.js";
import {
  GetTechnicalAnalysisResponse,
  GetEconophysicsAnalysisResponse,
  GetMarketStateResponse,
  GetMonteCarloSimulationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function getPrices(): number[] {
  const buf = getPriceBuffer();
  return buf.map(b => b.price);
}

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj, (_k, v) => {
    if (typeof v === "number" && (isNaN(v) || !isFinite(v))) return 0;
    return v;
  })) as Record<string, unknown>;
}

router.get("/technical", (_req, res) => {
  try {
    const prices = getPrices();
    const result = computeTechnical(prices);
    const parsed = GetTechnicalAnalysisResponse.parse(sanitize({
      ...result,
      timestamp: new Date().toISOString(),
    }));
    res.json(parsed);
  } catch (err) {
    console.error("technical error:", err);
    res.status(500).json({ error: "Analysis unavailable" });
  }
});

router.get("/econophysics", (_req, res) => {
  try {
    const prices = getPrices();
    const result = computeEconophysics(prices);
    const parsed = GetEconophysicsAnalysisResponse.parse(sanitize({
      ...result,
      timestamp: new Date().toISOString(),
    }));
    res.json(parsed);
  } catch (err) {
    console.error("econophysics error:", err);
    res.status(500).json({ error: "Analysis unavailable" });
  }
});

router.get("/market-state", (_req, res) => {
  try {
    const prices = getPrices();
    const result = computeMarketState(prices);
    const parsed = GetMarketStateResponse.parse(sanitize({
      ...result,
      timestamp: new Date().toISOString(),
    }));
    res.json(parsed);
  } catch (err) {
    console.error("market-state error:", err);
    res.status(500).json({ error: "Analysis unavailable" });
  }
});

router.get("/monte-carlo", (_req, res) => {
  try {
    const prices = getPrices();
    const result = runMonteCarlo(prices, 1000);
    const parsed = GetMonteCarloSimulationResponse.parse(sanitize({
      ...result,
      timestamp: new Date().toISOString(),
    }));
    res.json(parsed);
  } catch (err) {
    console.error("monte-carlo error:", err);
    res.status(500).json({ error: "Analysis unavailable" });
  }
});

export default router;
