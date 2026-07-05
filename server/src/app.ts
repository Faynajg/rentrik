import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { config } from "./lib/config";
import { errorHandler } from "./lib/errors";
import authRoutes from "./routes/auth.routes";
import propertiesRoutes from "./routes/properties.routes";
import reservationsRoutes from "./routes/reservations.routes";
import expensesRoutes from "./routes/expenses.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import reportsRoutes from "./routes/reports.routes";
import metaRoutes from "./routes/meta.routes";
import billingRoutes, { billingWebhookHandler } from "./routes/billing.routes";
import ownersRoutes from "./routes/owners.routes";
import exportRoutes from "./routes/export.routes";
import incidentsRoutes from "./routes/incidents.routes";
import portalRoutes from "./routes/portal.routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1); // detrás del proxy de Railway/producción
  app.use(cors({ origin: config.clientOrigin }));

  // El webhook de Stripe necesita el cuerpo sin parsear (antes de express.json).
  app.post("/api/billing/webhook", express.raw({ type: "application/json" }), billingWebhookHandler);

  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ ok: true, service: "rentrik-api" }));

  app.use("/api/auth", authRoutes);
  app.use("/api", metaRoutes); // /api/plans
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/properties", propertiesRoutes);
  // reservas y gastos cuelgan de /api/properties/:id/...
  app.use("/api/properties", reservationsRoutes);
  app.use("/api/properties", expensesRoutes);
  app.use("/api/properties", incidentsRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/owners", ownersRoutes);
  app.use("/api/export", exportRoutes);
  app.use("/api/portal", portalRoutes);

  // En producción, sirve el frontend compilado (una sola URL para toda la app).
  const clientDist = path.resolve(__dirname, "../../client/dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
