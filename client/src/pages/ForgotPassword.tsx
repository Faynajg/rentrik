import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { Alert } from "../components/ui";
import { AuthLayout } from "./Login";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ devResetUrl?: string }>("/auth/forgot-password", { email });
      setSent(true);
      setDevUrl(res.data.devResetUrl ?? null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Recuperar contraseña" subtitle="Te enviaremos un enlace para restablecerla">
      {sent ? (
        <div className="space-y-4">
          <Alert kind="success">
            Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer la contraseña.
            Revisa tu bandeja de entrada.
          </Alert>
          {devUrl && (
            <div className="rounded-xl border border-slate-100 bg-canvas p-4 text-xs text-slate-500">
              <p className="mb-1 font-semibold text-slate-600">Modo desarrollo (sin email configurado):</p>
              <Link to={devUrl.replace(/^https?:\/\/[^/]+/, "")} className="break-all font-medium text-brand hover:underline">
                {devUrl}
              </Link>
            </div>
          )}
          <Link to="/login" className="btn-ghost w-full">Volver a iniciar sesión</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="tu@email.com" />
          </div>
          <button className="btn-primary btn-lg w-full" disabled={loading}>
            {loading ? "Enviando…" : "Enviar enlace de recuperación"}
          </button>
          <p className="text-center text-sm text-slate-500">
            <Link to="/login" className="font-semibold text-brand hover:underline">Volver a iniciar sesión</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
