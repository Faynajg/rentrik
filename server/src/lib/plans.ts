/** Definición de los 4 planes de Rentrik (Fase 1: sin pasarela de pago). */
export interface Plan {
  id: string;
  name: string;
  price: number; // €/mes
  maxProperties: number; // Infinity = ilimitado
  ownBranding: boolean;
  features: string[];
}

export const PLANS: Record<string, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 15,
    maxProperties: 3,
    ownBranding: false,
    features: [
      "Hasta 3 propiedades",
      "Subida de CSV de cualquier OTA",
      "Dashboard con KPIs",
      "PDF para el propietario",
    ],
  },
  gestor: {
    id: "gestor",
    name: "Gestor",
    price: 79,
    maxProperties: 15,
    ownBranding: false,
    features: [
      "Hasta 15 propiedades",
      "Dashboard completo",
      "PDF para propietario y gestora",
      "Gráficos e histórico",
    ],
  },
  agencia: {
    id: "agencia",
    name: "Agencia",
    price: 189,
    maxProperties: Infinity,
    ownBranding: true,
    features: [
      "Propiedades ilimitadas",
      "Todo lo del plan Gestor",
      "Comparativas y ranking de rentabilidad",
      "Soporte prioritario",
    ],
  },
};

export function getPlan(id: string): Plan {
  return PLANS[id] ?? PLANS.starter;
}
