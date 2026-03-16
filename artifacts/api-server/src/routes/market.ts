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
  try {
    const data = getCurrentPrice();
    const parsed = GetMarketPriceResponse.parse(data);
    res.json(parsed);
  } catch (err) {
    console.error("price error:", err);
    res.status(500).json({ error: "Price unavailable" });
  }
});

router.get("/history", async (req, res) => {
  try {
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
  } catch (err) {
    console.error("history error:", err);
    res.status(500).json({ error: "History unavailable" });
  }
});

router.post("/pip-adjustment", (req, res) => {
  try {
    const body = UpdatePipAdjustmentBody.parse(req.body);
    setPipAdjustment(body.pips);
    const parsed = UpdatePipAdjustmentResponse.parse({
      pipAdjustment: body.pips,
      message: `Pip adjustment set to ${body.pips} pips`,
    });
    res.json(parsed);
  } catch (err) {
    console.error("pip-adjustment error:", err);
    res.status(500).json({ error: "Adjustment failed" });
  }
});

export default router;
