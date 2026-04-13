# MongliAgent 🤖

**Agente de investigación autónomo con micropagos x402 en Stellar Testnet**

MongliAgent recibe una pregunta y un presupuesto en USDC, planifica subtareas de investigación, paga on-chain por cada herramienta que usa (búsqueda web, resumen IA) usando el protocolo x402 sobre Stellar, y entrega un reporte estructurado con todas las transacciones verificables en blockchain.

> Construido para el hackathon **Agents on Stellar** — abril 2026

---

## Demo en vivo

| Servicio | URL |
|---|---|
| UI (Vercel) | https://mongliagent.vercel.app |
| Orchestrator API (Railway) | https://mongliagent-production.up.railway.app |
| Health check | https://mongliagent-production.up.railway.app/health |
| Stellar Explorer (Testnet) | https://stellar.expert/explorer/testnet |
| Wallet del agente | `GAEMNYLXVHXU3LOISQDACN3KPJULUIO2QUK3H5I2A2DDZOO3AHVEWIO4` |

---

## Por qué MongliAgent y no un chatbot o navegador normal

| | Navegador / Google | ChatGPT / Claude | **MongliAgent** |
|---|---|---|---|
| Búsquedas automáticas | ❌ Manual | ⚠️ Limitado | ✅ Autónomo |
| Paga por cada herramienta | ❌ No | ❌ No | ✅ x402 on-chain |
| Auditable en blockchain | ❌ No | ❌ No | ✅ Cada tx verificable |
| Control de presupuesto | ❌ No | ❌ No | ✅ Exacto en USDC |
| Fuentes citadas con costo | ❌ No | ⚠️ A veces | ✅ Tabla con precio por fuente |
| Wallet propia del usuario | ❌ No | ❌ No | ✅ Freighter — 1 sola firma |
| Sin suscripción mensual | ✅ | ❌ $20/mes | ✅ Pagas solo lo que usas |

### Ventajas concretas

**vs. hacer la búsqueda tú mismo en el navegador**
- En vez de abrir 10 pestañas y leer cada una, MongliAgent lo hace solo y te entrega un reporte estructurado con fuentes citadas.
- Sabes exactamente cuánto costó cada búsqueda: $0.01 USDC por consulta, visible on-chain.
- Puedes verificar que la información vino de fuentes reales — no es texto generado sin fuente.

**vs. usar ChatGPT o Claude directamente**
- Los chatbots usan su propio conocimiento o herramientas cerradas. MongliAgent paga por acceso a datos reales en tiempo real.
- Cada consulta genera una transacción Stellar verificable — transparencia total vs. caja negra.
- Control de presupuesto real: defines cuánto USDC gastar y el agente se detiene cuando se acaba. Un chatbot no tiene eso.
- Sin suscripción mensual. Pagas $0.05 por investigación, no $20/mes.

**vs. otras soluciones de agentes IA**
- Implementa el protocolo x402 nativo — el estándar emergente de micropagos para agentes.
- Los pagos son reales en Stellar Testnet (no simulados), con hash verificable públicamente.
- Wallet Connect con Freighter: el usuario controla su propio dinero — el agente nunca tiene acceso a fondos del usuario más allá del presupuesto aprobado en una sola firma.

---

## Cómo funciona el protocolo x402

```
Con Freighter (una sola firma al inicio):

Usuario                   Orchestrator               Servicio (ej. /buscar)
   │                           │                              │
   │── 1. Aprobar en Freighter ▶│ (fondeo de sesión on-chain)  │
   │── 2. POST /investigar ─────▶│                              │
   │                            │── POST /buscar ─────────────▶│
   │                            │                 ◀── 402 Payment Required
   │                            │── paga con wallet del agente ▶│ (tx on-chain)
   │                            │── POST /buscar + X-Payment ──▶│
   │                            │◀─ 200 { results } ────────────│
   │◀─ 200 { report, txHashes }─│
   │
   ▼ Cada txHash verificable en stellar.expert
```

El agente ejecuta **pagos reales** en Stellar Testnet. Cada transacción tiene un hash verificable en el explorador público. No es simulado.

---

## Wallet Connect con Freighter

MongliAgent integra la extensión [Freighter](https://freighter.app) para que el usuario pague con su propia wallet:

1. Conectar Freighter → ver tu dirección en el header
2. Hacer clic en "Investigar" → Freighter abre **un solo popup de aprobación**
3. Aprobar el monto total del presupuesto → 1 transacción on-chain
4. El agente usa esos fondos para ejecutar la investigación automáticamente
5. Ver el hash del fondeo en el sidebar con link a Stellar Expert

**Sin Freighter conectado:** el agente usa la wallet del servidor y funciona igual.

### Fondear tu wallet Freighter con USDC testnet

1. Instalar [Freighter](https://freighter.app) en Chrome/Brave
2. Crear o importar una wallet — cambiar la red a **Testnet**
3. Copiar tu dirección pública (empieza con G)
4. Ir a [laboratory.stellar.org](https://laboratory.stellar.org/#account-creator?network=test) → pegar tu dirección → "Fund account with Friendbot" (XLM gratis)
5. Agregar trustline de USDC:
   - En Laboratory → Build Transaction → Source: tu dirección → Add Operation → Change Trust
   - Asset: `USDC`, Issuer: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
   - Firmar con tu clave secreta → Submit
6. Obtener USDC testnet en [faucet.circle.com](https://faucet.circle.com) — seleccionar **Stellar Testnet**

---

## Arquitectura

```
apps/
├── orchestrator/          # Servidor Express consolidado (Railway)
│   └── src/
│       ├── index.ts           # Endpoints principales + servicios x402
│       ├── planner.ts         # Divide la pregunta en subtareas
│       ├── executor.ts        # Ejecuta subtareas con payAndFetch
│       ├── x402Middleware.ts  # Valida pago antes de servir
│       └── stellar/
│           ├── payAndFetch.ts     # Ciclo x402: solicitar → pagar → reintentar
│           ├── stellarPay.ts      # Construye, firma y envía la tx Stellar
│           └── types.ts
└── ui/                    # React + Tailwind (Vercel)
    └── src/
        ├── App.tsx                    # Estado global, firma Freighter, polling
        ├── hooks/useFreighter.ts      # Conectar wallet, firmar, enviar a Horizon
        └── components/
            ├── FreighterButton.tsx    # Botón conectar wallet en header
            ├── ResearchForm.tsx       # Pregunta + presupuesto
            ├── PaymentFeed.tsx        # Live feed de eventos en tiempo real
            └── ReportPanel.tsx        # Reporte markdown + txHashes on-chain
```

---

## Instalación local

```bash
git clone https://github.com/ALFA_117_EDG/MongliAgent.git
cd MongliAgent
npm install
```

### Orchestrator

```bash
cd apps/orchestrator
cp .env.example .env   # Configura las variables (ver abajo)
npm run dev
```

### UI

```bash
cd apps/ui
# Crea apps/ui/.env.local con:
# VITE_ORCHESTRATOR_URL=http://localhost:3000
npm run dev
```

---

## Variables de entorno

### Orchestrator (Railway / `.env`)

| Variable | Descripción | Requerida |
|---|---|---|
| `STELLAR_SECRET_KEY` | Clave secreta de la wallet del agente (empieza con S) | ✅ |
| `STELLAR_PUBLIC_KEY` | Clave pública de la wallet del agente (empieza con G) | ✅ |
| `STELLAR_NETWORK` | `testnet` o `mainnet` | ✅ |
| `PORT` | Puerto del servidor Express | Auto (Railway) |
| `SEARCH_API_KEY` | API key de SerpAPI o Brave Search | ✅ |
| `ANTHROPIC_API_KEY` | API key de Anthropic (opcional — hay fallback local) | ⬜ |

### UI (Vercel / `.env.local`)

| Variable | Descripción |
|---|---|
| `VITE_ORCHESTRATOR_URL` | URL completa del orchestrator en Railway |

---

## Fondear la wallet del agente (Testnet)

Para que el agente pueda hacer pagos reales necesita XLM y USDC en Testnet:

1. **Generar keypair** en [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
2. **Fondear con XLM** — clic en "Fund account with Friendbot" (gratis)
3. **Agregar trustline de USDC** — en Laboratory > Build Transaction > Add Operation > Change Trust
   - Asset: `USDC`, Issuer: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
4. **Obtener USDC Testnet** — [faucet.circle.com](https://faucet.circle.com) (seleccionar **Stellar Testnet**)
5. Poner `STELLAR_SECRET_KEY` y `STELLAR_PUBLIC_KEY` en las variables de Railway

---

## Deploy

### Orchestrator → Railway

1. Conectar repositorio en [railway.app](https://railway.app)
2. Root directory: `apps/orchestrator`
3. Agregar las variables de entorno
4. Railway detecta el `package.json` y despliega automáticamente

### UI → Vercel

1. Conectar repositorio en [vercel.com](https://vercel.com)
2. Framework: **Vite** — Root directory: `apps/ui`
3. Agregar variable: `VITE_ORCHESTRATOR_URL=https://tu-app.up.railway.app`

---

## API endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/preparar-sesion` | Construye XDR sin firmar para Freighter |
| `POST` | `/investigar` | Inicia una sesión de investigación |
| `GET` | `/estado/:sessionId` | Polling del estado y eventos |
| `POST` | `/buscar` | Búsqueda web (protegido con x402) |
| `POST` | `/resumir` | Resumen IA (protegido con x402) |
| `GET` | `/health` | Estado del servidor + wallet |

### POST `/investigar`

```json
{
  "pregunta": "¿Cuáles son los últimos avances en micropagos con IA?",
  "presupuestoUsdc": 0.10,
  "userPublicKey": "GABC...",
  "fundingTxHash": "abc123..."
}
```

---

## Modelo de negocio — por qué invertir

### El problema que resuelve

Los agentes de IA actualmente no pueden pagar por herramientas de forma autónoma, transparente y sin intermediarios. Usan APIs cerradas, suscripciones mensuales fijas y no tienen accountability financiero. MongliAgent resuelve esto con micropagos x402 en Stellar.

### Revenue streams

| Fuente | Mecanismo | Potencial |
|---|---|---|
| **Comisión de protocolo** | 5-10% de cada pago x402 procesado | Escala con el volumen |
| **API B2B** | Empresas integran el agente en sus productos | Precio por llamada |
| **White label** | Otras empresas despliegan su propio agente x402 | Licencia mensual |
| **Marketplace x402** | Catálogo de servicios (búsqueda, datos, análisis, imágenes) que el agente puede contratar | Comisión por transacción |
| **Datos de mercado** | Estadísticas anonimizadas de qué herramientas usan los agentes y a qué precio | Suscripción analytics |

### Por qué ahora

- El protocolo x402 es **emergente** — quien lo implemente primero a escala establece el estándar.
- Los agentes de IA pasarán de consumidores de información a **agentes económicos autónomos** que contratan servicios. Ese mercado no tiene infraestructura hoy.
- Stellar ofrece finalidad en **3-5 segundos** con comisiones de **< $0.001** — ideal para micropagos de agentes.
- La transparencia on-chain es un diferenciador regulatorio: cada centavo gastado es auditable.

### Tracción actual

- Pagos reales ejecutándose en Stellar Testnet con USDC
- Protocolo x402 implementado de extremo a extremo
- UI lista para el consumidor con Wallet Connect (Freighter)
- Arquitectura multi-servicio consolidada — corre en Railway gratis

### Roadmap de inversión

```
Fase 1 (0-3 meses)  — Producto
  ├── Mainnet Stellar con USDC real
  ├── Marketplace de servicios x402 (búsqueda, datos, análisis)
  └── SDK público para desarrolladores

Fase 2 (3-9 meses)  — Crecimiento
  ├── API B2B con pricing por volumen
  ├── Integraciones con frameworks de agentes (LangChain, CrewAI)
  └── Dashboard de analytics para proveedores x402

Fase 3 (9-18 meses) — Escala
  ├── Red de servicios x402 (terceros publican sus propios servicios)
  ├── Protocolo de reputación on-chain para proveedores
  └── Expansión a otros blockchains (EVM, Solana)
```

### Contacto para inversores

**ALFA_EDG** · [@ALFA_EDG_](https://instagram.com/ALFA_EDG_) on Instagram

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | TypeScript + Express + Node.js |
| Frontend | React 18 + Tailwind CSS + Vite |
| Pagos | Stellar SDK + protocolo x402 + USDC Testnet |
| Wallet Connect | @stellar/freighter-api |
| Búsqueda | SerpAPI / Brave Search |
| IA (opcional) | Anthropic Claude API |
| Deploy backend | Railway |
| Deploy frontend | Vercel |

---

## Transacciones reales verificadas

```
https://stellar.expert/explorer/testnet/tx/<txHash>
```

Cada investigación genera múltiples transacciones on-chain, todas verificables públicamente. El fondeo de sesión con Freighter también genera una transacción real.

---

## Autor

**ALFA_EDG** · [@ALFA_EDG_](https://instagram.com/ALFA_EDG_) on Instagram

---

*Agents on Stellar Hackathon — abril 2026*
