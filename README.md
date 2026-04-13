# MongliAgent 🤖

**Agente de investigación autónomo con micropagos x402 en Stellar**

MongliAgent es un agente de IA que investiga de forma completamente autónoma y paga por cada herramienta que usa con micropagos reales en USDC sobre la red Stellar usando el protocolo x402. El usuario escribe una pregunta, define un presupuesto, conecta su wallet Freighter y aprueba una sola transacción. A partir de ahí el agente opera solo: planifica subtareas, contrata servicios, paga on-chain y entrega un reporte con fuentes citadas y todas las transacciones verificables en blockchain.

> Construido para el hackathon **Agents on Stellar** — abril 2026

---

## Links

| | |
|---|---|
| 🎥 **Demo en video** | [youtu.be/vNpK11j91d4](https://youtu.be/vNpK11j91d4) |
| 🌐 **App en vivo** | [mongliagent.vercel.app](https://mongliagent.vercel.app) |
| 💻 **Código fuente** | [github.com/ALFA117/MongliAgent](https://github.com/ALFA117/MongliAgent) |
| 📸 **Instagram** | [@alfa_edg_](https://instagram.com/alfa_edg_) |
| 🔗 **Orchestrator API** | [mongliagent-production.up.railway.app](https://mongliagent-production.up.railway.app/health) |
| 🔭 **Stellar Explorer** | [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet) |

---

## Cómo funciona

### El protocolo x402

```
Usuario                   Orchestrator               Servicio (ej. /buscar)
   │                           │                              │
   │── 1. Aprobar en Freighter─▶│  (fondeo de sesión on-chain) │
   │── 2. POST /investigar ─────▶│                              │
   │                            │── POST /buscar ─────────────▶│
   │                            │              ◀── 402 Payment Required
   │                            │                  { price: 0.01 USDC,
   │                            │                    payTo: G... }
   │                            │── paga en Stellar ──────────▶│  (tx real)
   │                            │── POST /buscar + X-Payment ──▶│
   │                            │◀─ 200 { resultados } ─────────│
   │◀─ reporte + txHashes ──────│
   │
   ▼  Cada txHash verificable en stellar.expert
```

Cuando el agente necesita usar un servicio, el servidor responde con **HTTP 402 Payment Required** especificando el precio en USDC y la dirección Stellar. El agente construye la transacción, la firma y envía on-chain, obtiene el `txHash` y lo adjunta en el header `X-Payment` al reintentar. El servicio verifica el pago en blockchain y entrega los datos. Todo en 3-5 segundos gracias a la finalidad de Stellar.

### Wallet Connect con Freighter

1. El usuario conecta [Freighter](https://freighter.app) desde el header
2. Al iniciar la investigación, el agente construye **una sola transacción** con el presupuesto completo
3. Freighter muestra **un único popup de aprobación** — el usuario firma una vez
4. El agente opera completamente autónomo a partir de ahí
5. El hash del fondeo aparece en la UI con link directo a Stellar Expert

---

## Por qué MongliAgent

### vs. buscar en Google o navegador

En lugar de abrir 10 tabs, leer cada uno y sintetizar manualmente, MongliAgent hace todo eso de forma autónoma y entrega un reporte estructurado con fuentes. Cada búsqueda cuesta $0.01 USDC — visible on-chain.

### vs. ChatGPT o Claude

Los chatbots usan conocimiento interno o herramientas cerradas sin transparencia. MongliAgent paga por datos reales en tiempo real, cita todas las fuentes, muestra el costo exacto de cada consulta y registra todo en blockchain. Sin alucinaciones sin fuente.

### vs. otras soluciones de agentes

La mayoría de frameworks de agentes usan APIs centralizadas con billing opaco. MongliAgent implementa x402 — un estándar abierto donde cada transacción es auditable, el presupuesto es exacto y el usuario mantiene el control de sus fondos.

### vs. suscripciones mensuales

Sin $20/mes. Pagas exactamente lo que usas: $0.01-$0.05 USDC por investigación.

---

## Comparativa

| | Navegador | ChatGPT/Claude | **MongliAgent** |
|---|---|---|---|
| Búsquedas automáticas | ❌ Manual | ⚠️ Limitado | ✅ Autónomo |
| Pagos on-chain auditables | ❌ No | ❌ No | ✅ Cada tx verificable |
| Control exacto de presupuesto | ❌ No | ❌ No | ✅ En USDC |
| Fuentes citadas con costo | ❌ No | ⚠️ A veces | ✅ Tabla completa |
| Wallet propia del usuario | ❌ No | ❌ No | ✅ Freighter — 1 firma |
| Sin suscripción mensual | ✅ | ❌ $20/mes | ✅ Pay-per-use |
| Transparencia financiera | ❌ No | ❌ No | ✅ Blockchain |

---

## Ventajas

**Transparencia total** — cada pago es una transacción real con un hash verificable públicamente. Cualquier persona puede auditar cuánto gastó el agente y en qué.

**Control exacto del presupuesto** — el usuario define cuánto USDC gastar. El agente se detiene automáticamente cuando se agota. Nunca hay cobros inesperados.

**Sin suscripción** — pay-per-use estricto. Una investigación completa cuesta entre $0.03 y $0.20 USDC.

**Autonomía real** — planifica, ejecuta, paga y reporta sin intervención. Una sola firma de Freighter al inicio es suficiente para toda la sesión.

**Extensible por diseño** — cualquier servicio HTTP que implemente x402 puede ser contratado automáticamente por el agente. El protocolo es abierto.

**Descentralización financiera** — los pagos van directamente entre wallets en Stellar. Sin intermediarios, sin plataforma de pagos centralizada.

**Wallet bajo control del usuario** — Freighter firma con la clave privada que nunca sale del dispositivo. El agente nunca tiene acceso directo a los fondos del usuario.

---

## Desventajas

**Fricción de onboarding** — el usuario necesita instalar Freighter, configurarlo en Testnet y obtener USDC testnet. Más pasos que un chatbot de email y contraseña.

**Velocidad de Stellar** — cada pago tarda 3-5 segundos en confirmarse on-chain. En investigaciones con muchas subtareas ese tiempo se acumula.

**Dependencia de APIs externas** — necesita una API de búsqueda real (SerpAPI/Brave). Hay fallback local pero los resultados son menos relevantes.

**Testnet únicamente** — opera en Stellar Testnet con USDC de prueba. Migración a mainnet requiere auditoría de seguridad adicional.

---

## Arquitectura

```
apps/
├── orchestrator/              # Servidor Express consolidado (Railway)
│   └── src/
│       ├── index.ts           # Endpoints + servicios x402 integrados
│       ├── planner.ts         # Divide la pregunta en subtareas
│       ├── executor.ts        # Ejecuta subtareas con payAndFetch
│       ├── x402Middleware.ts  # Valida pagos antes de servir
│       └── stellar/
│           ├── payAndFetch.ts     # Ciclo x402: solicitar → pagar → reintentar
│           ├── stellarPay.ts      # Construye, firma y envía tx Stellar
│           └── types.ts
└── ui/                        # React + Tailwind (Vercel)
    └── src/
        ├── App.tsx                    # Estado global, firma Freighter, polling
        ├── hooks/useFreighter.ts      # Conectar wallet, firmar, enviar a Horizon
        └── components/
            ├── FreighterButton.tsx    # Botón conectar wallet en header
            ├── ResearchForm.tsx       # Pregunta + presupuesto + validación
            ├── PaymentFeed.tsx        # Live feed de eventos en tiempo real
            └── ReportPanel.tsx        # Reporte markdown + txHashes on-chain
```

Un solo proceso Express sirve el orchestrator y los servicios `/buscar` y `/resumir`. Así cabe en el plan gratuito de Railway (límite: 2 servicios).

---

## Instalación local

```bash
git clone https://github.com/ALFA117/MongliAgent.git
cd MongliAgent
npm install
```

### Orchestrator

```bash
cd apps/orchestrator
# Crear .env con las variables (ver tabla abajo)
npm run dev
```

### UI

```bash
cd apps/ui
# Crear .env.local:
# VITE_ORCHESTRATOR_URL=http://localhost:3000
npm run dev
```

---

## Variables de entorno

### Orchestrator (Railway)

| Variable | Descripción | Requerida |
|---|---|---|
| `STELLAR_SECRET_KEY` | Clave secreta de la wallet del agente (empieza con S) | ✅ |
| `STELLAR_PUBLIC_KEY` | Clave pública de la wallet del agente (empieza con G) | ✅ |
| `STELLAR_NETWORK` | `testnet` | ✅ |
| `SEARCH_API_KEY` | API key de SerpAPI o Brave Search | ✅ |
| `ANTHROPIC_API_KEY` | API key de Anthropic (opcional — hay fallback local) | ⬜ |

### UI (Vercel)

| Variable | Descripción |
|---|---|
| `VITE_ORCHESTRATOR_URL` | URL del orchestrator en Railway |

---

## Fondear la wallet del agente (Testnet)

1. Generar keypair en [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
2. Fondear con XLM — clic en "Fund account with Friendbot"
3. Agregar trustline de USDC:
   - Asset: `USDC` · Issuer: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
4. Obtener USDC testnet en [faucet.circle.com](https://faucet.circle.com) — seleccionar **Stellar Testnet**
5. Agregar `STELLAR_SECRET_KEY` y `STELLAR_PUBLIC_KEY` en Railway

### Fondear tu wallet Freighter

1. Instalar [Freighter](https://freighter.app) en Chrome/Brave → cambiar red a **Testnet**
2. Copiar tu dirección pública (G...)
3. Ir a [laboratory.stellar.org](https://laboratory.stellar.org/#account-creator?network=test) → "Fund account with Friendbot"
4. Agregar trustline de USDC (mismo proceso que arriba)
5. Obtener USDC testnet en [faucet.circle.com](https://faucet.circle.com)

---

## API endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/preparar-sesion` | Construye XDR sin firmar para Freighter |
| `POST` | `/investigar` | Inicia una sesión de investigación |
| `GET` | `/estado/:sessionId` | Polling del estado y eventos en tiempo real |
| `POST` | `/buscar` | Búsqueda web protegida con x402 ($0.01 USDC) |
| `POST` | `/resumir` | Resumen IA protegido con x402 ($0.02 USDC) |
| `GET` | `/health` | Estado del servidor y wallet del agente |

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | TypeScript + Express + Node.js |
| Frontend | React 18 + Tailwind CSS + Vite |
| Pagos | Stellar SDK + protocolo x402 + USDC Testnet |
| Wallet Connect | @stellar/freighter-api |
| Búsqueda | SerpAPI / Brave Search |
| IA (opcional) | Anthropic Claude API + fallback local |
| Deploy backend | Railway |
| Deploy frontend | Vercel |

---

## Modelo de negocio

### Revenue streams

| Fuente | Mecanismo |
|---|---|
| **Comisión de protocolo** | 5-10% de cada pago x402 procesado |
| **API B2B** | Empresas integran el agente en sus productos — precio por llamada |
| **White label** | Otras empresas despliegan su propio agente x402 — licencia mensual |
| **Marketplace x402** | Catálogo de servicios que el agente puede contratar — comisión por tx |
| **Analytics** | Estadísticas de qué herramientas usan los agentes y a qué precio |

### Por qué ahora

El protocolo x402 es emergente — quien lo implemente primero a escala establece el estándar. Los agentes de IA están pasando de consumidores de información a agentes económicos autónomos que contratan servicios. Ese mercado no tiene infraestructura hoy. Stellar ofrece finalidad en 3-5 segundos con comisiones de menos de $0.001 — ideal para micropagos de agentes. La transparencia on-chain es además un diferenciador regulatorio.

### Roadmap

```
Fase 1 (0-3 meses)   Mainnet Stellar + Marketplace de servicios x402 + SDK público
Fase 2 (3-9 meses)   API B2B + integraciones con LangChain/CrewAI + analytics
Fase 3 (9-18 meses)  Red de servicios x402 de terceros + reputación on-chain
```

---

## Autor

**ALFA_EDG** · [@alfa_edg_](https://instagram.com/alfa_edg_) on Instagram

---

*Agents on Stellar Hackathon — abril 2026*
