import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ApiError, asyncHandler } from "../lib/errors";

/**
 * Estados que dan acceso al producto. Es el mismo criterio que aplica el
 * frontend (SUBSCRIBED en App.tsx): si cambia uno, debe cambiar el otro.
 * `past_due` entra a propósito, como periodo de gracia mientras se reintenta
 * el cobro; quien cancela ("canceled") o nunca contrató ("none") queda fuera.
 */
const SUBSCRIBED = new Set(["trialing", "active", "past_due"]);

/**
 * Exige suscripción vigente. Va SIEMPRE después de requireAuth, que es quien
 * rellena req.userId.
 *
 * Hasta ahora el acceso solo lo bloqueaba el frontend, así que un token válido
 * bastaba para usar la API entera sin pagar (crear propiedades, importar
 * reservas, generar los PDFs...). Esto lo cierra en el servidor.
 */
export const requireSubscription = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { subscriptionStatus: true },
    });
    if (!user) throw new ApiError(401, "No autenticado");
    if (!SUBSCRIBED.has(user.subscriptionStatus)) {
      // 402: el cliente distingue este caso y lleva a la página de planes.
      throw new ApiError(402, "Necesitas una suscripción activa para usar esta función.");
    }
    next();
  }
);
