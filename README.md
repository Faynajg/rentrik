# Rentrik

SaaS de rentabilidad para alquiler vacacional. Sube tus ingresos de las OTAs (Airbnb,
Booking, VRBO…), introduce tus gastos reales y obtén al instante un dashboard de
rentabilidad y dos informes PDF profesionales (para propietario y para gestora).

> **Fase 1 (MVP)** — Autenticación, subida de CSV con detección automática de formato,
> introducción de gastos, dashboard con KPIs, informes PDF y página de precios.

---

## Stack

| Capa        | Tecnología                                             |
|-------------|--------------------------------------------------------|
| Frontend    | React + Vite + TypeScript + Tailwind CSS + Recharts    |
| Backend     | Node.js + Express + TypeScript                          |
| Base datos  | Prisma ORM sobre SQLite (cambiable a PostgreSQL)        |
| CSV         | Papa Parse                                              |
| PDF         | pdfkit                                                  |
| Auth        | JWT + bcrypt                                            |

## Estructura

```
Rentrik/
├── server/          # API Express + Prisma + lógica de negocio
│   ├── prisma/      # schema.prisma + seed
│   └── src/
│       ├── routes/       # endpoints REST
│       ├── middleware/    # auth, errores
│       ├── services/      # KPIs, CSV, PDF
│       └── lib/           # prisma client, jwt, config
└── client/          # SPA React
    └── src/
        ├── pages/
        ├── components/
        ├── context/
        └── api/
```

## Puesta en marcha

Requisitos: Node.js 18+.

### 1. Backend

```bash
cd server
cp .env.example .env     # copia la plantilla de variables de entorno
npm install
npm run db:setup        # genera cliente Prisma + crea la BD + datos de ejemplo
npm run dev             # arranca la API en http://localhost:4000
```

> Todas las variables están documentadas en [`server/.env.example`](server/.env.example).

### 2. Frontend

```bash
cd client
npm install
npm run dev             # arranca la app en http://localhost:5173
```

### Usuario de ejemplo (tras `db:setup`)

- **Email:** demo@rentrik.com
- **Contraseña:** demo1234

## Pagos con Stripe

La app funciona **sin Stripe** en *modo simulado*: los usuarios tienen 14 días de prueba
gratuita (sin tarjeta) y los cambios de plan se aplican al instante.

Para activar cobros reales, rellena en `server/.env`:

```bash
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."     # de `stripe listen` o del panel de webhooks
STRIPE_PRICE_STARTER="price_..."      # opcional: ya hay Price IDs por defecto en el código
STRIPE_PRICE_GESTOR="price_..."
STRIPE_PRICE_AGENCIA="price_..."
```

Con las claves configuradas, "Elegir plan" abre el **Checkout de Stripe** (suscripción con
los días de prueba restantes) y "Gestionar suscripción" abre el **portal de cliente**.

Webhook local para desarrollo:

```bash
stripe listen --forward-to localhost:4000/api/billing/webhook
```

Eventos gestionados: `checkout.session.completed`, `customer.subscription.created/updated/deleted`.

## Emails (SMTP)

La app funciona **sin email**: en desarrollo los correos se registran en consola y el enlace
de recuperación de contraseña se devuelve en la respuesta de la API. Para envío real, configura
en `server/.env`:

```bash
SMTP_HOST="smtp.tu-proveedor.com"
SMTP_PORT=587
SMTP_USER="usuario"
SMTP_PASS="contraseña"
EMAIL_FROM="Rentrik <no-reply@tudominio.com>"
```

Correos que envía Rentrik: **bienvenida** (al registrarse), **recordatorio de fin de prueba**
(3 días antes, vía tarea programada diaria) e **informe del propietario** (PDF adjunto, desde
la pestaña Propietarios).

## Monedas e IVA

Cada usuario elige su **moneda** (EUR, USD, MXN, COP, ARS, CLP, PEN) y su **tipo de IVA** desde
*Mi cuenta → Moneda e impuestos*. La moneda se aplica en toda la app y en los informes PDF.

## Cambiar a PostgreSQL

En `server/prisma/schema.prisma` cambia `provider = "sqlite"` por `provider = "postgresql"`
y ajusta `DATABASE_URL` en `server/.env`. Luego `npm run db:setup`.

## Despliegue en Railway (automático)

El repositorio incluye `railway.json` y `nixpacks.toml`, así que Railway **construye y arranca
solo**: instala `client` y `server`, compila ambos, aplica el esquema a la BD y levanta el
servidor (que sirve también el frontend). Un único servicio, un único dominio.

**Único cambio de código obligatorio** — Railway tiene disco efímero, así que hay que usar
PostgreSQL: en `server/prisma/schema.prisma` pon `provider = "postgresql"`.

Pasos:

1. Sube el repo a GitHub.
2. En [railway.app](https://railway.app): **New Project → Deploy from GitHub repo**.
3. En el proyecto: **New → Database → PostgreSQL** (crea la variable `DATABASE_URL`).
4. En el servicio de la app, pestaña **Variables**, añade:
   ```
   DATABASE_URL          = ${{Postgres.DATABASE_URL}}
   JWT_SECRET            = <cadena larga y aleatoria>
   CLIENT_ORIGIN         = https://rentrik.app
   TRIAL_DAYS            = 14
   STRIPE_SECRET_KEY     = sk_live_...        (opcional)
   STRIPE_WEBHOOK_SECRET = whsec_...          (opcional)
   STRIPE_PRICE_STARTER  = price_...          (y GESTOR/PRO/AGENCIA)
   SMTP_HOST/PORT/USER/PASS, EMAIL_FROM       (opcional)
   ```
   No definas `PORT`: Railway la inyecta y el servidor la usa.
5. **Settings → Networking → Custom Domain**: añade `rentrik.app` y configura el DNS que indique
   Railway (CNAME para `www`, ALIAS/ANAME para la raíz). SSL automático.
6. Webhook de Stripe (si usas pagos): `https://rentrik.app/api/billing/webhook`.

Railway lee `railway.json`/`nixpacks.toml` automáticamente; no hay que escribir comandos de build
ni de start a mano. El healthcheck apunta a `/api/health`.

> **Nota:** el arranque ejecuta `prisma db push` (idempotente) para sincronizar el esquema. Para
> producción a largo plazo, considera migrar a `prisma migrate` (`migrate deploy`).

## Integración continua (CI)

`.github/workflows/ci.yml` ejecuta **typecheck + build** de cliente y servidor en cada push a
`main` y en cada Pull Request. Si algo no compila, verás el fallo antes de desplegar.

Para que un despliegue en Railway **nunca** salga de código roto, trabaja con Pull Requests y activa
en GitHub *Settings → Branches → Branch protection rule* sobre `main`, marcando **"Require status
checks to pass before merging"** y seleccionando el check **CI**.
