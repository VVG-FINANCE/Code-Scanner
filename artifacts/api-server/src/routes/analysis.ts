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

router.get("/technical", (_req, res) => {
  const prices = getPrices();
  const result = computeTechnical(prices);
  const parsed = GetTechnicalAnalysisResponse.parse({
    ...result,
    timestamp: new Date().toISOString(),
  });
  res.json(parsed);
});

router.get("/econophysics", (_req, res) => {
  const prices = getPrices();
  const result = computeEconophysics(prices);
  const parsed = GetEconophysicsAnalysisResponse.parse({
    ...result,
    timestamp: new Date().toISOString(),
  });
  res.json(parsed);
});

router.get("/market-state", (_req, res) => {
  const prices = getPrices();
  const result = computeMarketState(prices);
  const parsed = GetMarketStateResponse.parse({
    ...result,
    timestamp: new Date().toISOString(),
  });
  res.json(parsed);
});

router.get("/monte-carlo", (_req, res) => {
  const prices = getPrices();
  const result = runMonteCarlo(prices, 1000);
  const parsed = GetMonteCarloSimulationResponse.parse({
    ...result,
    timestamp: new Date().toISOString(),
  });
  res.json(parsed);
});

export default router;
