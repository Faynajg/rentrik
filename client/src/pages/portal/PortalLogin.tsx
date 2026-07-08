import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { errorMessage } from "../../api/client";
import { Logo } from "../../components/Logo";
import { Alert, PasswordInput } from "../../components/ui";

export default function PortalLogin() {
  const { login } = useOwnerAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/portal");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10">
      <Link to="/" className="mb-8">
        <Logo size={30} className="text-2xl" />
      </Link>
      <div className="card w-full max-w-md p-8">
        <span className="inline-flex rounded-full border border-brand/15 bg-brand/5 px-3 py-1 text-2xs font-semibold uppercase tracking-wide text-brand">
          Portal del propietario
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Accede a tus propiedades</h1>
        <p className="mt-1 text-sm text-slate-500">Consulta tus ingresos, informes e histórico en modo solo lectura.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn-primary btn-lg w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          ¿Eres gestora? <Link to="/login" className="font-semibold text-brand hover:underline">Accede aquí</Link>
        </p>
      </div>
    </div>
  );
}
