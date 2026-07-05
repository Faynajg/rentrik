import { Component, ErrorInfo, ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/** Captura errores de render para mostrar un mensaje amable en vez de una pantalla en blanco. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error capturado por ErrorBoundary:", error, info);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-negative-soft text-negative">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-ink">Algo ha ido mal</h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Ha ocurrido un error inesperado al mostrar esta página. Puedes reintentar o volver al panel.
          </p>
          <div className="mt-6 flex gap-3">
            <button onClick={this.reset} className="btn-ghost">Reintentar</button>
            <Link to="/dashboard" onClick={this.reset} className="btn-primary">Volver al dashboard</Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
