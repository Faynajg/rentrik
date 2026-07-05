import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { OwnerAuthProvider, useOwnerAuth } from "./context/OwnerAuthContext";
import { AppShell } from "./components/AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Spinner } from "./components/ui";
import { ReactNode } from "react";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import PropertyDetail from "./pages/PropertyDetail";
import Account from "./pages/Account";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Comparativa from "./pages/Comparativa";
import Estacionalidad from "./pages/Estacionalidad";
import Historico from "./pages/Historico";
import Propietarios from "./pages/Propietarios";
import Calculadora from "./pages/Calculadora";
import { Terminos, Privacidad } from "./pages/Legal";
import PortalLogin from "./pages/portal/PortalLogin";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalPropertyDetail from "./pages/portal/PortalPropertyDetail";

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen"><Spinner label="Cargando…" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell><ErrorBoundary>{children}</ErrorBoundary></AppShell>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen"><Spinner /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ─── Portal del propietario (contexto de auth independiente) ───
function PortalLayout() {
  return (
    <OwnerAuthProvider>
      <Outlet />
    </OwnerAuthProvider>
  );
}

function PortalProtected({ children }: { children: ReactNode }) {
  const { owner, loading } = useOwnerAuth();
  if (loading) return <div className="min-h-screen"><Spinner label="Cargando…" /></div>;
  if (!owner) return <Navigate to="/portal/login" replace />;
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/registro" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/recuperar" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
      <Route path="/restablecer" element={<ResetPassword />} />
      <Route path="/precios-publico" element={<Pricing publicView />} />
      <Route path="/terminos" element={<Terminos />} />
      <Route path="/privacidad" element={<Privacidad />} />

      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/comparativa" element={<Protected><Comparativa /></Protected>} />
      <Route path="/estacionalidad" element={<Protected><Estacionalidad /></Protected>} />
      <Route path="/historico" element={<Protected><Historico /></Protected>} />
      <Route path="/propietarios" element={<Protected><Propietarios /></Protected>} />
      <Route path="/calculadora" element={<Protected><Calculadora /></Protected>} />
      <Route path="/propiedades/:id" element={<Protected><PropertyDetail /></Protected>} />
      <Route path="/cuenta" element={<Protected><Account /></Protected>} />
      <Route path="/precios" element={<Protected><Pricing /></Protected>} />

      {/* Portal del propietario */}
      <Route element={<PortalLayout />}>
        <Route path="/portal/login" element={<PortalLogin />} />
        <Route path="/portal" element={<PortalProtected><PortalDashboard /></PortalProtected>} />
        <Route path="/portal/propiedades/:id" element={<PortalProtected><PortalPropertyDetail /></PortalProtected>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
