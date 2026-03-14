import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import marketRouter from "./market.js";
import analysisRouter from "./analysis.js";
import signalsRouter from "./signals.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/market", marketRouter);
router.use("/analysis", analysisRouter);
router.use("/signals", signalsRouter);

export default router;
