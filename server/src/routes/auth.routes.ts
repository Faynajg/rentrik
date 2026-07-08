import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { ApiError, asyncHandler } from "../lib/errors";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { getPlan, PLANS } from "../lib/plans";
import { config } from "../lib/config";
import { emailEnabled, passwordResetEmail, sendEmail } from "../lib/email";
import { CURRENCIES } from "../lib/currency";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  companyName: z.string().optional(),
  plan: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

function trialDaysLeft(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

function publicUser(u: {
  id: string;
  email: string;
  name: string;
  companyName: string | null;
  plan: string;
  currency: string;
  ivaRate: number;
  autoSendReports: boolean;
  autoSendDay: number;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  demoMode?: boolean;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    companyName: u.companyName,
    plan: u.plan,
    planInfo: getPlan(u.plan),
    currency: u.currency,
    ivaRate: u.ivaRate,
    autoSendReports: u.autoSendReports,
    autoSendDay: u.autoSendDay,
    subscriptionStatus: u.subscriptionStatus,
    trialEndsAt: u.trialEndsAt,
    trialDaysLeft: trialDaysLeft(u.trialEndsAt),
    demoMode: u.demoMode ?? false,
  };
}

// POST /api/auth/register
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const plan = data.plan && PLANS[data.plan] ? data.plan : "starter";

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(409, "Ya existe una cuenta con ese email");

    const passwordHash = await bcrypt.hash(data.password, 10);
    // Sin prueba in-app: la prueba de 14 días la gestiona Stripe al suscribirse.
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        companyName: data.companyName ?? null,
        plan,
        subscriptionStatus: "none",
      },
    });

    // El email de bienvenida se envía al iniciar el trial (webhook de Stripe),
    // no en el registro, porque la prueba de 14 días arranca tras el checkout.

    const token = signToken({ userId: user.id });
    res.status(201).json({ token, user: publicUser(user) });
  })
);

// POST /api/auth/login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new ApiError(401, "Email o contraseña incorrectos");

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) throw new ApiError(401, "Email o contraseña incorrectos");

    const token = signToken({ userId: user.id });
    res.json({ token, user: publicUser(user) });
  })
);

// GET /api/auth/me
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new ApiError(404, "Usuario no encontrado");
    res.json({ user: publicUser(user) });
  })
);

// PATCH /api/auth/me  (actualizar plan / datos de empresa)
router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      companyName: z.string().optional(),
      plan: z.string().optional(),
      name: z.string().min(2).optional(),
      currency: z.string().optional(),
      ivaRate: z.number().min(0).max(100).optional(),
      autoSendReports: z.boolean().optional(),
      autoSendDay: z.number().int().min(1).max(28).optional(),
    });
    const data = schema.parse(req.body);
    const patch: Record<string, string | number | boolean | null> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.companyName !== undefined) patch.companyName = data.companyName;
    if (data.plan !== undefined && PLANS[data.plan]) patch.plan = data.plan;
    if (data.currency !== undefined && CURRENCIES[data.currency]) patch.currency = data.currency;
    if (data.ivaRate !== undefined) patch.ivaRate = data.ivaRate;
    if (data.autoSendReports !== undefined) patch.autoSendReports = data.autoSendReports;
    if (data.autoSendDay !== undefined) patch.autoSendDay = data.autoSendDay;

    const user = await prisma.user.update({ where: { id: req.userId }, data: patch });
    res.json({ user: publicUser(user) });
  })
);

// POST /api/auth/change-password
router.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
        newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
      })
      .parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new ApiError(404, "Usuario no encontrado");

    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) throw new ApiError(401, "La contraseña actual no es correcta");

    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ ok: true });
  })
);

// POST /api/auth/forgot-password  { email }
// Responde 200 siempre (no revela si el email existe). En modo dev devuelve resetUrl.
router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email("Email inválido") }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    let devResetUrl: string | undefined;
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

      const resetUrl = `${config.clientOrigin}/restablecer?token=${rawToken}`;
      const mail = passwordResetEmail(user.name, resetUrl);
      await sendEmail({ to: user.email, subject: mail.subject, html: mail.html });
      if (!emailEnabled) devResetUrl = resetUrl; // conveniencia en desarrollo
    }

    res.json({
      ok: true,
      message: "Si el email existe, te hemos enviado un enlace para restablecer la contraseña.",
      ...(devResetUrl ? { devResetUrl } : {}),
    });
  })
);

// POST /api/auth/reset-password  { token, newPassword }
router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        token: z.string().min(1, "Token requerido"),
        newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
      })
      .parse(req.body);

    const tokenHash = crypto.createHash("sha256").update(data.token).digest("hex");
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new ApiError(400, "El enlace no es válido o ha caducado. Solicita uno nuevo.");
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    res.json({ ok: true });
  })
);

export default router;
