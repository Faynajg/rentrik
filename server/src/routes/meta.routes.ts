import { Router } from "express";
import { PLANS } from "../lib/plans";

const router = Router();

// GET /api/plans — lista pública de planes para la página de precios.
router.get("/plans", (_req, res) => {
  const plans = Object.values(PLANS).map((p) => ({
    ...p,
    maxProperties: p.maxProperties === Infinity ? null : p.maxProperties,
  }));
  res.json({ plans });
});

export default router;
