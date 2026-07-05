import cron from "node-cron";
import { prisma } from "./prisma";
import { sendEmail, trialReminderEmail } from "./email";
import { previousMonth } from "./dates";
import { runMonthlyOwnerReportsForUser } from "../services/ownerReports";

const DAY = 24 * 60 * 60 * 1000;

/** Envía el recordatorio a usuarios en prueba a los que les quedan ≤3 días. */
export async function sendTrialReminders(): Promise<number> {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * DAY);

  const users = await prisma.user.findMany({
    where: {
      subscriptionStatus: "trialing",
      trialReminderSent: false,
      trialEndsAt: { lte: in3Days, gt: now },
    },
  });

  for (const u of users) {
    const daysLeft = Math.max(1, Math.ceil((u.trialEndsAt!.getTime() - now.getTime()) / DAY));
    const mail = trialReminderEmail(u.name, daysLeft);
    await sendEmail({ to: u.email, subject: mail.subject, html: mail.html });
    await prisma.user.update({ where: { id: u.id }, data: { trialReminderSent: true } });
  }

  if (users.length > 0) console.log(`📧 Recordatorios de fin de prueba enviados: ${users.length}`);
  return users.length;
}

/**
 * Auto-envío mensual de informes a propietarios.
 * Para cada gestora con auto-envío activo (a partir de su día configurado), envía el informe
 * del MES ANTERIOR de cada propiedad asignada a cada propietario con email. Es idempotente:
 * si ya existe un envío registrado para (propietario, propiedad, mes), lo omite.
 */
export async function sendMonthlyOwnerReports(): Promise<number> {
  const today = new Date().getDate();
  const month = previousMonth(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );

  const users = await prisma.user.findMany({ where: { autoSendReports: true }, select: { id: true, autoSendDay: true } });

  let sent = 0;
  for (const user of users) {
    if (today < user.autoSendDay) continue; // aún no toca este mes
    sent += await runMonthlyOwnerReportsForUser(user.id, month);
  }

  if (sent > 0) console.log(`📧 Informes mensuales auto-enviados a propietarios: ${sent}`);
  return sent;
}

/** Arranca las tareas programadas (recordatorios de prueba + auto-envío de informes). */
export function startScheduler() {
  // Todos los días a las 9:00.
  cron.schedule("0 9 * * *", () => {
    sendTrialReminders().catch((err) => console.error("Error en recordatorios de prueba:", err));
    sendMonthlyOwnerReports().catch((err) => console.error("Error en auto-envío de informes:", err));
  });
  // Comprobación inicial al arrancar (no bloqueante).
  sendTrialReminders().catch((err) => console.error("Error en recordatorios de prueba:", err));
  sendMonthlyOwnerReports().catch((err) => console.error("Error en auto-envío de informes:", err));
}
