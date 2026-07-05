import axios from "axios";

/** Cliente Axios central. El token JWT se inyecta desde el AuthContext. */
export const api = axios.create({
  baseURL: "/api",
});

const TOKEN_KEY = "rentrik_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function applyAuthHeader(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

// Inicializa el header si ya había token guardado.
applyAuthHeader(getStoredToken());

/** Extrae un mensaje de error legible de una respuesta de la API. */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error ?? err.message ?? "Error de conexión";
  }
  return "Error inesperado";
}

/** Descarga un archivo autenticado (blob) y dispara la descarga en el navegador. */
export async function downloadFile(url: string, filename: string, mime?: string) {
  const res = await api.get(url, { responseType: "blob" });
  const blob = new Blob([res.data], mime ? { type: mime } : undefined);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

/** Descarga un PDF autenticado. */
export async function downloadPdf(url: string, filename: string) {
  return downloadFile(url, filename, "application/pdf");
}

// ─── Portal del propietario (token independiente) ──────────────────
const OWNER_TOKEN_KEY = "rentrik_owner_token";

export const portalApi = axios.create({ baseURL: "/api" });

export function getOwnerToken(): string | null {
  return localStorage.getItem(OWNER_TOKEN_KEY);
}

export function setOwnerToken(token: string | null) {
  if (token) {
    localStorage.setItem(OWNER_TOKEN_KEY, token);
    portalApi.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem(OWNER_TOKEN_KEY);
    delete portalApi.defaults.headers.common.Authorization;
  }
}

setOwnerToken(getOwnerToken());

/** Descarga un PDF desde el portal del propietario (token de propietario). */
export async function downloadOwnerPdf(url: string, filename: string) {
  const res = await portalApi.get(url, { responseType: "blob" });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
