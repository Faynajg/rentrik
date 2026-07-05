import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "rentrik-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  trialDays: Number(process.env.TRIAL_DAYS ?? 14),
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    prices: {
      starter: process.env.STRIPE_PRICE_STARTER ?? "",
      gestor: process.env.STRIPE_PRICE_GESTOR ?? "",
      pro: process.env.STRIPE_PRICE_PRO ?? "",
      agencia: process.env.STRIPE_PRICE_AGENCIA ?? "",
    } as Record<string, string>,
  },
};

/** Stripe está activo sólo si hay clave secreta configurada. */
export const stripeEnabled = Boolean(config.stripe.secretKey);
