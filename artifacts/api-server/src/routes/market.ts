import { Router, type IRouter } from "express";
import { getCurrentPrice, setPipAdjustment, getPriceHistory } from "../lib/market-data.js";
import {
  GetMarketPriceResponse,
  UpdatePipAdjustmentBody,
  UpdatePipAdjustmentResponse,
  GetMarketHistoryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/price", (_req, res) => {
  const data = getCurrentPrice();
  const parsed = GetMarketPriceResponse.parse(data);
  res.json(parsed);
});

router.get("/history", async (req, res) => {
  const limit = Number(req.query["limit"]) || 100;
  const rows = await getPriceHistory(Math.min(limit, 500));
  const data = rows.map(r => ({
    price: r.price,
    timestamp: r.timestamp.toISOString(),
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
  }));
  const parsed = GetMarketHistoryResponse.parse({ data, count: data.length });
  res.json(parsed);
});

router.post("/pip-adjustment", (req, res) => {
  const body = UpdatePipAdjustmentBody.parse(req.body);
  setPipAdjustment(body.pips);
  const parsed = UpdatePipAdjustmentResponse.parse({
    pipAdjustment: body.pips,
    message: `Pip adjustment set to ${body.pips} pips`,
  });
  res.json(parsed);
});

export default router;
