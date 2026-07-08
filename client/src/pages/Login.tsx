import { FormEvent, ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../api/client";
import { Logo } from "../components/Logo";
import { Alert, PasswordInput } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@rentrik.com");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Bienvenido de nuevo" subtitle="Accede a tu panel de rentabilidad">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label">Contraseña</label>
            <Link to="/recuperar" className="mb-1.5 text-xs font-medium text-brand hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn-primary btn-lg w-full" disabled={loading}>
          {loading ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        ¿No tienes cuenta?{" "}
        <Link to="/registro" className="font-semibold text-brand hover:underline">
          Prueba 14 días gratis
        </Link>
      </p>
      <div className="mt-5 rounded-xl border border-slate-100 bg-canvas px-4 py-3 text-center text-xs text-slate-400">
        Cuenta de demostración · <span className="font-medium text-slate-500">demo@rentrik.com</span> / demo1234
      </div>
    </AuthLayout>
  );
}

const BENEFITS = [
  "Beneficio neto real de cada propiedad",
  "Informes PDF para propietario y gestora",
  "Compatible con Airbnb, Booking, VRBO y más OTAs",
];

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Panel de marca (izquierda) */}
      <aside className="relative hidden w-1/2 overflow-hidden bg-brand-gradient lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 bg-hero-grid [background-size:40px_40px] opacity-30" />
        <div className="relative flex h-full flex-col p-12">
          <Link to="/">
            <Logo light size={30} className="text-xl" />
          </Link>
          <div className="my-auto max-w-md">
            <h2 className="text-3xl font-bold leading-tight text-white">
              La rentabilidad real de tu alquiler vacacional, sin hojas de cálculo.
            </h2>
            <ul className="mt-8 space-y-4">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-3 text-brand-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-positive/20 text-positive-light">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span className="text-sm text-white/90">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs text-white/50">
            © {new Date().getFullYear()} Rentrik · Informes de inversión para gestores profesionales
          </p>
        </div>
      </aside>

      {/* Formulario (derecha) */}
      <div className="flex w-full flex-col items-center justify-center px-5 py-10 lg:w-1/2">
        <div className="w-full max-w-md animate-fadeUp">
          <Link to="/" className="mb-8 inline-flex lg:hidden">
            <Logo size={28} className="text-xl" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
