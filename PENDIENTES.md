# Pendientes — MongliAgent Hackathon

**Fecha límite:** 13 de abril 2026 · **Hoy:** 12 de abril · **Quedan ~24 horas**

---

## Estado general

| Ítem | Estado |
|---|---|
| Wallet Stellar Testnet | Parcial |
| Orchestrator deployado | **Falta (bloqueante)** |
| Servicio de búsqueda (service-search) | Falta |
| Servicio de resumen (service-summary) | Falta |
| Pagos x402 reales en Testnet | Falta (obligatorio) |
| UI traducida al español | Pendiente |
| Live feed conectado al orchestrator real | Pendiente |

---

## Detalle por ítem

### Parcial — Wallet Stellar Testnet
La wallet debe estar generada y fondeada con XLM y USDC de testnet.
Confirmar que tenga saldo real antes de continuar.

---

### Falta — Orchestrator deployado *(bloqueante)*
La UI llama a `/api/research` y recibe 404 porque el servidor Express
no existe en Vercel. Hay que deployarlo en Railway. Sin esto nada funciona.

---

### Falta — Servicio de búsqueda (service-search)
- Puerto 3001
- Endpoint `POST /buscar`
- Cobra 0.01 USDC por consulta vía x402
- Usa Brave Search o SerpAPI para resultados reales
- Este es el servicio más importante del demo

---

### Falta — Servicio de resumen (service-summary)
- Puerto 3002
- Endpoint `POST /resumir`
- Cobra 0.02 USDC por llamada vía x402
- Usa la Claude API para resumir texto
- Demuestra que hasta la IA se paga por uso

---

### Falta — Pagos x402 reales en Testnet *(obligatorio para el hackathon)*
El hackathon exige transacciones reales en Stellar Testnet o Mainnet.
Sin hashes de transacción verificables en el explorador, el proyecto no califica.
Actualmente hay 0 transacciones procesadas.

---

### Pendiente — UI traducida al español
Todos los textos de la interfaz deben estar en español: etiquetas,
mensajes del live feed, botones, reporte final y errores.

---

### Pendiente — Live feed conectado al orchestrator real
Actualmente el feed está vacío. Cuando el orchestrator esté deployado,
la UI debe hacer polling a `/estado/:sessionId` cada 2 segundos y mostrar
cada pago en tiempo real.

---

## Requisitos formales del hackathon — checklist

- [x] **Repositorio público** — GitHub con código fuente completo. Ya cumplido.
- [ ] **README detallado** — Explicar qué es el proyecto, cómo instalarlo,
  variables de entorno, qué funciona y qué no. El actual está incompleto.
- [ ] **Video demo de 2 a 3 minutos** — Mostrar el flujo completo:
  pregunta → live feed de pagos → hash de transacción verificable → reporte final.
  Todavía no se puede grabar porque el backend no está corriendo.
- [ ] **Transacciones reales en Stellar Testnet o Mainnet** — El hackathon exige
  esto explícitamente. Actualmente hay 0 transacciones procesadas.

---

## Meta final — lo que debe verse en el video demo

| # | Paso | Estado |
|---|---|---|
| 1 | Usuario escribe la pregunta en español (ej: "¿Cuáles son los últimos avances en pagos con IA en 2025?") | Pendiente |
| 2 | Usuario define el presupuesto en USDC (slider o input, ej: 0.10 USDC) | Pendiente |
| 3 | Clic en "Investigar" y el agente arranca — el orchestrator planifica las subtareas automáticamente | Bloqueado |
| 4 | Live feed muestra cada pago en tiempo real: Servicio · monto cobrado · hash de transacción · balance restante | Bloqueado |
| 5 | Al menos un hash verificable en Stellar Explorer — el juez hace clic y ve la transacción real on-chain | Bloqueado |
| 6 | Reporte final aparece en español: Resumen · fuentes consultadas · total gastado · tiempo | Bloqueado |

---

## Instrucción completa para Claude Code

```
PRIORIDAD MÁXIMA — el hackathon cierra mañana 13 de abril.

El proyecto MongliAgent tiene la UI funcionando en Vercel pero el
orchestrator y los servicios x402 no están deployados. La UI llama
a /api/research y recibe 404. Necesito que todo funcione en español
de punta a punta hoy.

Haz esto en orden estricto:

1. TRADUCIR la UI completa al español — todos los textos, labels,
   mensajes del live feed, errores y el reporte final deben estar
   en español.

2. CREAR el orchestrator en apps/orchestrator/src/index.ts con:
   - POST /investigar que recibe { pregunta, presupuestoUsdc }
   - GET /estado/:sessionId que devuelve el log de pagos en tiempo real
   - Lógica con Claude API para planificar máximo 3 subtareas
   - Función payAndFetch en packages/stellar-utils que maneja el
     ciclo x402 completo (402 → firma → reintento → 200)
   - Escuchar en process.env.PORT || 3000

3. CREAR service-search en apps/service-search/src/index.ts con:
   - POST /buscar protegido con middleware x402-stellar
   - Precio: 0.01 USDC por consulta
   - Llamar a Brave Search API con la SEARCH_API_KEY del .env
   - Puerto 3001

4. CREAR service-summary en apps/service-summary/src/index.ts con:
   - POST /resumir protegido con middleware x402-stellar
   - Precio: 0.02 USDC por resumen
   - Usar Claude API para resumir el texto recibido
   - Puerto 3002

5. CREAR railway.json en cada app para el deploy:
   { "deploy": { "startCommand": "npm start" } }

6. ACTUALIZAR la UI para que:
   - Llame a la URL del orchestrator en Railway (usar variable
     de entorno VITE_ORCHESTRATOR_URL)
   - El live feed haga polling cada 2 segundos a /estado/:sessionId
   - Muestre: nombre del servicio, monto en USDC, hash de
     transacción como link al explorador de Stellar testnet,
     y balance restante
   - Todo el texto en español

7. HACER commit y push de todo al repo.

8. Decirme exactamente cómo deployar cada servicio en Railway
   paso a paso.

Las variables de entorno disponibles son:
ANTHROPIC_API_KEY, STELLAR_SECRET_KEY, STELLAR_PUBLIC_KEY,
STELLAR_NETWORK=testnet, SEARCH_API_KEY

El issuer de USDC en testnet es:
GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
```

---

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `ANTHROPIC_API_KEY` | Para Claude API (orchestrator y service-summary) |
| `STELLAR_SECRET_KEY` | Clave privada de la wallet del agente |
| `STELLAR_PUBLIC_KEY` | Clave pública de la wallet del agente |
| `STELLAR_NETWORK` | `testnet` |
| `SEARCH_API_KEY` | Brave Search o SerpAPI |
| `VITE_ORCHESTRATOR_URL` | URL pública del orchestrator (Railway) — para la UI |

**USDC issuer en testnet:** `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
