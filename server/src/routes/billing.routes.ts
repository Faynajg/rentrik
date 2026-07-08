import { Request, Response, Router } from "express";
import { z } from "zod";
import type Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { ApiError, asyncHandler } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { config } from "../lib/config";
import { priceIdForPlan, stripe, stripeEnabled } from "../lib/stripe";
import { PLANS } from "../lib/plans";
import { sendEmail, welcomeEmail } from "../lib/email";

const router = Router();
router.use(requireAuth);

/** Días de prueba restantes a partir de trialEndsAt. */
function trialDaysLeft(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const ms = trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Mapea un Price ID de Stripe a su plan. */
function planForPrice(priceId: string | null | undefined): string | null {
  if (!priceId) return null;
  for (const [plan, pid] of Object.entries(config.stripe.prices)) {
    if (pid && pid === priceId) return plan;
  }
  return null;
}

async function ensureCustomer(user: {
  id: string;
  email: string;
  name: string;
  stripeCustomerId: string | null;
}): Promise<string> {
  if (!stripe) throw new ApiError(500, "Stripe no está configurado");
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  });
  await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

// GET /api/billing/status
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new ApiError(404, "Usuario no encontrado");
    res.json({
      stripeEnabled,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
      trialDaysLeft: trialDaysLeft(user.trialEndsAt),
      hasActiveSubscription: Boolean(user.stripeSubscriptionId) && user.subscriptionStatus === "active",
      currentPeriodEnd: user.currentPeriodEnd,
    });
  })
);

// POST /api/billing/checkout  { plan }
// Con Stripe configurado devuelve { url } (Checkout). En modo simulado cambia el plan y devuelve { updated }.
router.post(
  "/checkout",
  asyncHandler(async (req, res) => {
    const { plan } = z.object({ plan: z.enum(["starter", "gestor", "agencia"]) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new ApiError(404, "Usuario no encontrado");

    const priceId = priceIdForPlan(plan);

    // Modo simulado: sin Stripe o sin Price ID configurado para el plan.
    if (!stripe || !priceId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan, subscriptionStatus: stripeEnabled ? user.subscriptionStatus : "active" },
      });
      return res.json({ updated: true, simulated: true, plan });
    }

    const customerId = await ensureCustomer(user);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        // Prueba gratuita de 14 días: no se cobra hasta que termine.
        trial_period_days: config.trialDays,
        metadata: { userId: user.id, plan },
      },
      metadata: { userId: user.id, plan },
      success_url: `${config.clientOrigin}/precios?checkout=success`,
      cancel_url: `${config.clientOrigin}/precios?checkout=cancel`,
    });

    res.json({ url: session.url });
  })
);

// POST /api/billing/portal  → portal de cliente de Stripe para gestionar la suscripción.
router.post(
  "/portal",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new ApiError(404, "Usuario no encontrado");
    if (!stripe || !user.stripeCustomerId) {
      throw new ApiError(400, "No hay una suscripción activa que gestionar.");
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${config.clientOrigin}/precios`,
    });
    res.json({ url: session.url });
  })
);

export default router;

/**
 * Manejador del webhook de Stripe. Se monta aparte en app.ts con express.raw
 * porque necesita el cuerpo sin parsear para verificar la firma.
 */
export async function billingWebhookHandler(req: Request, res: Response) {
  if (!stripe) return res.status(200).json({ received: true, ignored: "stripe-disabled" });

  // Exige el secreto del webhook: sin él NO se aceptan eventos (evita eventos falsificados).
  if (!config.stripe.webhookSecret) {
    console.error("Falta STRIPE_WEBHOOK_SECRET: no se pueden verificar los eventos de Stripe.");
    return res.status(500).send("Webhook no configurado: falta STRIPE_WEBHOOK_SECRET.");
  }

  let event: Stripe.Event;
  try {
    const signature = req.headers["stripe-signature"] as string;
    // Verifica la firma del evento con el secreto del webhook.
    event = stripe.webhooks.constructEvent(req.body, signature, config.stripe.webhookSecret);
  } catch (err) {
    console.error("Verificación de la firma del webhook fallida:", err);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        if (userId && session.subscription) {
          const before = await prisma.user.findUnique({ where: { id: userId } });
          const firstSubscription = before && !before.stripeSubscriptionId;
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: plan && PLANS[plan] ? plan : undefined,
              stripeSubscriptionId: sub.id,
              subscriptionStatus: mapStatus(sub.status),
              currentPeriodEnd: periodEnd(sub),
              trialEndsAt: trialEnd(sub),
            },
          });
          // Email de bienvenida al activarse el trial (solo la primera suscripción).
          if (firstSubscription && before) {
            const welcome = welcomeEmail(before.name);
            sendEmail({ to: before.email, subject: welcome.subject, html: welcome.html }).catch(() => {});
          }
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price?.id;
        const plan = sub.metadata?.plan ?? planForPrice(priceId);
        await prisma.user.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: {
            plan: plan && PLANS[plan] ? plan : undefined,
            stripeSubscriptionId: sub.id,
            subscriptionStatus: mapStatus(sub.status),
            currentPeriodEnd: periodEnd(sub),
            trialEndsAt: trialEnd(sub),
          },
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.user.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: { subscriptionStatus: "canceled", stripeSubscriptionId: null },
        });
        break;
      }
    }
  } catch (err) {
    console.error("Error procesando webhook:", err);
  }

  res.json({ received: true });
}

function mapStatus(status: Stripe.Subscription.Status): string {
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "canceled";
}

function periodEnd(sub: Stripe.Subscription): Date | null {
  const end = (sub as unknown as { current_period_end?: number }).current_period_end;
  return end ? new Date(end * 1000) : null;
}

/** Fin del periodo de prueba de Stripe (para reflejarlo en la app). */
function trialEnd(sub: Stripe.Subscription): Date | null {
  const end = (sub as unknown as { trial_end?: number | null }).trial_end;
  return end ? new Date(end * 1000) : null;
}
