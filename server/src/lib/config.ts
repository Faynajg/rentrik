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
    // Price IDs reales de Stripe (por defecto). Las variables de entorno los sobreescriben.
    // Se usa `||` para que un valor vacío también recurra al valor por defecto.
    // Pro aún no tiene Price ID → sin cobro real (modo simulado) hasta configurarlo.
    prices: {
      starter: process.env.STRIPE_PRICE_STARTER || "price_1TqD7RF46dkVUoaJMyDxZUEA",
      gestor: process.env.STRIPE_PRICE_GESTOR || "price_1TqDGdF46dkVUoaJcTmMcoCH",
      pro: process.env.STRIPE_PRICE_PRO || "",
      agencia: process.env.STRIPE_PRICE_AGENCIA || "price_1TqDSMF46dkVUoaJQ1mDww9W",
    } as Record<string, string>,
  },
};

/** Stripe está activo sólo si hay clave secreta configurada. */
export const stripeEnabled = Boolean(config.stripe.secretKey);
