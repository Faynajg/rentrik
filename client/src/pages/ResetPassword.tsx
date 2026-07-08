import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { Alert, PasswordInput } from "../components/ui";
import { AuthLayout } from "./Login";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Enlace no válido" subtitle="Falta el token de recuperación">
        <Alert kind="error">Este enlace no es válido. Solicita uno nuevo desde "Recuperar contraseña".</Alert>
        <Link to="/recuperar" className="btn-primary mt-4 w-full">Solicitar nuevo enlace</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nueva contraseña" subtitle="Elige una contraseña segura">
      {done ? (
        <div className="space-y-4">
          <Alert kind="success">¡Contraseña actualizada! Te llevamos al inicio de sesión…</Alert>
          <Link to="/login" className="btn-primary w-full">Iniciar sesión</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <div>
            <label className="label">Nueva contraseña</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" autoFocus />
          </div>
          <div>
            <label className="label">Repite la contraseña</label>
            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <button className="btn-primary btn-lg w-full" disabled={loading}>
            {loading ? "Guardando…" : "Restablecer contraseña"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
