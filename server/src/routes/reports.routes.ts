import { Router } from "express";
import { asyncHandler } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { renderBankReport, renderManagerReport, renderOwnerReport } from "../services/reportBuilder";

const router = Router();
router.use(requireAuth);

function sendPdf(res: import("express").Response, filename: string, buffer: Buffer) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

// GET /api/reports/property/:id/owner.pdf?month=YYYY-MM
router.get(
  "/property/:id/owner.pdf",
  asyncHandler(async (req, res) => {
    const report = await renderOwnerReport(req.userId!, req.params.id, req.query.month as string | undefined);
    sendPdf(res, report.filename, report.buffer);
  })
);

// GET /api/reports/manager.pdf?month=YYYY-MM
router.get(
  "/manager.pdf",
  asyncHandler(async (req, res) => {
    const report = await renderManagerReport(req.userId!, req.query.month as string | undefined);
    sendPdf(res, report.filename, report.buffer);
  })
);

// GET /api/reports/property/:id/bank.pdf  (informe de ingresos verificados para banco)
router.get(
  "/property/:id/bank.pdf",
  asyncHandler(async (req, res) => {
    const report = await renderBankReport(req.userId!, req.params.id);
    sendPdf(res, report.filename, report.buffer);
  })
);

export default router;
