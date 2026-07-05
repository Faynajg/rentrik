import Stripe from "stripe";
import { config, stripeEnabled } from "./config";

/** Cliente Stripe. Es null si no hay clave configurada (modo simulado). */
// Sin apiVersion explícita: usa la versión por defecto de la cuenta (evita fijar una cadena concreta).
export const stripe: Stripe | null = stripeEnabled ? new Stripe(config.stripe.secretKey) : null;

export { stripeEnabled };

/** Devuelve el Price ID de Stripe configurado para un plan (o "" si no hay). */
export function priceIdForPlan(plan: string): string {
  return config.stripe.prices[plan] ?? "";
}
