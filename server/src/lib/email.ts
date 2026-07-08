import nodemailer from "nodemailer";
import { config } from "./config";

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
export const EMAIL_FROM = process.env.EMAIL_FROM ?? "Rentrik <no-reply@rentrik.com>";

/** El envío real de emails solo está activo si hay servidor SMTP configurado. */
export const emailEnabled = Boolean(SMTP_HOST);

const transporter = emailEnabled
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true }); // modo dev: no envía, solo serializa

export interface Attachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

/** Envía un email. Si no hay SMTP configurado, lo registra en consola (modo desarrollo). */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
}): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments,
    });
    if (!emailEnabled) {
      console.log(`📧 [email:dev] Para: ${opts.to} · Asunto: ${opts.subject}`);
    }
    return true;
  } catch (err) {
    console.error("Error enviando email:", err);
    return false;
  }
}

const BRAND = "#1E3A5F";
const GREEN = "#2ECC71";

/** Plantilla HTML de marca compartida por todos los correos. */
function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  return `
  <div style="background:#F6F8FB;padding:32px 0;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1F2937">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0">
      <div style="background:linear-gradient(135deg,#1E3A5F,#2C5282);padding:28px 32px">
        <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">Rentrik</span>
      </div>
      <div style="padding:32px">
        <h1 style="margin:0 0 16px;font-size:20px;color:${BRAND}">${title}</h1>
        <div style="font-size:15px;line-height:1.6;color:#475569">${bodyHtml}</div>
        ${
          cta
            ? `<div style="margin:28px 0 8px"><a href="${cta.url}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px">${cta.label}</a></div>`
            : ""
        }
      </div>
      <div style="padding:20px 32px;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8">
        Rentrik · Rentabilidad de tu alquiler vacacional
      </div>
    </div>
  </div>`;
}

export function welcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: "¡Bienvenido a Rentrik! 🎉",
    html: layout(
      `¡Hola, ${name}!`,
      `<p>Gracias por unirte a <strong>Rentrik</strong>. Ya puedes descubrir cuánto gana de verdad cada una de tus propiedades.</p>
       <p>Tienes <strong>14 días de prueba gratuita</strong>. Cancela cuando quieras. Para empezar:</p>
       <ol style="padding-left:18px">
         <li>Crea tu primera propiedad</li>
         <li>Sube el CSV de ingresos de tu OTA</li>
         <li>Introduce tus gastos y genera tu informe</li>
       </ol>`,
      { label: "Ir a mi panel", url: `${config.clientOrigin}/dashboard` }
    ),
  };
}

export function trialReminderEmail(name: string, daysLeft: number): { subject: string; html: string } {
  return {
    subject: `Te quedan ${daysLeft} días de prueba en Rentrik`,
    html: layout(
      `Hola, ${name}`,
      `<p>Tu periodo de prueba gratuito de Rentrik termina en <strong>${daysLeft} días</strong>.</p>
       <p>Elige un plan para seguir generando tus informes de rentabilidad sin interrupciones. Puedes cancelar cuando quieras.</p>`,
      { label: "Ver planes", url: `${config.clientOrigin}/precios` }
    ),
  };
}

export function passwordResetEmail(name: string, url: string): { subject: string; html: string } {
  return {
    subject: "Restablece tu contraseña de Rentrik",
    html: layout(
      `Hola, ${name}`,
      `<p>Hemos recibido una solicitud para restablecer tu contraseña. Pulsa el botón para elegir una nueva. El enlace caduca en 1 hora.</p>
       <p style="color:#94A3B8;font-size:13px">Si no has sido tú, puedes ignorar este correo.</p>`,
      { label: "Restablecer contraseña", url }
    ),
  };
}

export function ownerReportEmail(
  ownerName: string,
  propertyName: string,
  monthLabelText: string
): { subject: string; html: string } {
  return {
    subject: `Informe de rentabilidad · ${propertyName} · ${monthLabelText}`,
    html: layout(
      `Hola, ${ownerName}`,
      `<p>Adjuntamos el informe de rentabilidad de <strong>${propertyName}</strong> correspondiente a <strong>${monthLabelText}</strong>.</p>
       <p>Encontrarás el detalle de ingresos, gastos y beneficio neto en el PDF adjunto.</p>`
    ),
  };
}
