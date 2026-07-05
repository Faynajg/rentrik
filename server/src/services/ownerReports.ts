import { prisma } from "../lib/prisma";
import { emailEnabled, ownerReportEmail, sendEmail } from "../lib/email";
import { renderOwnerReport } from "./reportBuilder";

export interface DispatchResult {
  ok: boolean;
  sentTo: string;
  emailEnabled: boolean;
}

/**
 * Genera el informe del propietario para una propiedad y mes, lo envía por email
 * (si el propietario tiene email) y registra el envío en el historial.
 */
export async function dispatchOwnerReport(params: {
  userId: string;
  owner: { id: string; name: string; email: string | null };
  propertyId: string;
  month: string;
}): Promise<DispatchResult> {
  const { userId, owner, propertyId, month } = params;
  if (!owner.email) {
    throw new Error("El propietario no tiene email.");
  }

  const report = await renderOwnerReport(userId, propertyId, month);
  const mail = ownerReportEmail(owner.name, report.propertyName ?? "tu propiedad", report.monthLabelText);
  const ok = await sendEmail({
    to: owner.email,
    subject: mail.subject,
    html: mail.html,
    attachments: [{ filename: report.filename, content: report.buffer, contentType: "application/pdf" }],
  });

  await prisma.reportLog.create({
    data: { userId, ownerId: owner.id, propertyId, type: "owner", month, sentTo: owner.email },
  });

  return { ok, sentTo: owner.email, emailEnabled };
}

/**
 * Envía (una sola vez por mes) el informe de cada propiedad asignada a cada propietario
 * con email de una gestora. Idempotente y omite propiedades sin datos ese mes.
 * Devuelve cuántos informes se han enviado.
 */
export async function runMonthlyOwnerReportsForUser(userId: string, month: string): Promise<number> {
  const owners = await prisma.owner.findMany({
    where: { userId, email: { not: null } },
    include: { properties: { select: { id: true } } },
  });

  let sent = 0;
  for (const owner of owners) {
    for (const property of owner.properties) {
      const already = await prisma.reportLog.findFirst({
        where: { ownerId: owner.id, propertyId: property.id, month, type: "owner" },
      });
      if (already) continue;

      const [resCount, expCount] = await Promise.all([
        prisma.reservation.count({ where: { propertyId: property.id, month } }),
        prisma.expense.count({ where: { propertyId: property.id, month } }),
      ]);
      if (resCount === 0 && expCount === 0) continue;

      try {
        await dispatchOwnerReport({ userId, owner, propertyId: property.id, month });
        sent++;
      } catch (err) {
        console.error(`Error auto-enviando informe a ${owner.email}:`, err);
      }
    }
  }
  return sent;
}
