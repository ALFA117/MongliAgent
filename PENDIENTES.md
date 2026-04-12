# Pendientes — MongliAgent Hackathon

**Fecha límite:** 13 de abril 2026 · **Última actualización:** 12 de abril ~2:30 AM

---

## Estado actual (al terminar la sesión del 12 de abril)

| Ítem | Estado |
|---|---|
| Orchestrator deployado en Railway | ✅ Hecho — `https://mongliagent-production.up.railway.app` |
| UI en español con logo e Instagram | ✅ Hecho |
| UI conectada a Railway (VITE_ORCHESTRATOR_URL) | ✅ Hecho |
| Live feed con polling cada 2s | ✅ Hecho |
| Planner sin Claude API (fallback gratuito) | ✅ Hecho |
| Reporte sin Claude API (generado localmente) | ✅ Hecho |
| Resumen sin Claude API (extracción local) | ✅ Hecho |
| Wallet Stellar — fondear con XLM y USDC testnet | ⚠️ PENDIENTE |
| Pagos x402 reales ejecutándose | ⚠️ PENDIENTE (bloqueado por wallet) |
| Wallet connect — login de usuario con su propia wallet | ⚠️ PENDIENTE |
| README actualizado | ⚠️ PENDIENTE |
| Video demo grabado | ⚠️ PENDIENTE |

---

## Lo que falta mañana (en orden de prioridad)

### 1. CRÍTICO — Fondear la wallet del agente en Testnet

La wallet `STELLAR_PUBLIC_KEY` que está en Railway necesita tener saldo
de XLM y USDC en testnet para que el agente pueda pagar los servicios.

**Pasos para fondear:**
1. Ve a https://laboratory.stellar.org/account/create
2. Pega tu `STELLAR_PUBLIC_KEY`
3. Haz clic en "Create account" — el friendbot te da 10,000 XLM de testnet
4. Para conseguir USDC testnet:
   - Ve a https://stellar.expert/explorer/testnet
   - O usa el faucet de Circle en testnet
   - O crea un trustline manualmente con la herramienta de laboratorio

**Sin fondos en la wallet, los pagos x402 fallan silenciosamente.**

---

### 2. CRÍTICO — Verificar que los pagos x402 funcionan end-to-end

Después de fondear la wallet, hacer una prueba completa:
1. Abrir la UI
2. Escribir una pregunta
3. Darle a Investigar
4. Confirmar que aparece al menos un hash de transacción en el feed
5. Hacer clic en el hash y verificarlo en https://stellar.expert/explorer/testnet

Si esto funciona, el proyecto califica para el hackathon.

---

### 3. IMPORTANTE — Wallet Connect para usuarios

El usuario quiere que el visitante pueda **conectar su propia wallet de Stellar**
y pagar los servicios con sus propios fondos en lugar de la wallet del agente.

**Qué implica:**
- Integrar Freighter Wallet (extensión de Chrome para Stellar)
- El usuario conecta su wallet en la UI
- El pago x402 se firma con la wallet del usuario, no con el secret key del servidor
- La clave privada del usuario nunca toca el servidor

**Archivos a modificar:**
- `apps/ui/src/App.tsx` — agregar botón "Conectar Wallet"
- `apps/ui/src/components/WalletConnect.tsx` — nuevo componente
- `apps/ui/package.json` — agregar `@stellar/freighter-api`
- `apps/orchestrator/src/stellar/payAndFetch.ts` — soporte para firma en el cliente

**Dependencia npm:**
```
@stellar/freighter-api
```

**Flujo:**
1. Usuario hace clic en "Conectar Wallet"
2. Freighter pide permiso
3. UI obtiene la public key del usuario
4. Cuando el agente necesita pagar, manda la transacción sin firmar al frontend
5. Freighter la firma y la envía
6. El hash vuelve al servidor para el reintento con X-Payment

⚠️ Esto requiere rediseño del payAndFetch para modo cliente.
Alternativa más simple: el servidor mantiene la wallet pero muestra
la public key del usuario como "identidad".

---

### 4. PENDIENTE — README actualizado

El README actual está incompleto. Debe incluir:
- Qué es MongliAgent (descripción corta)
- Cómo funciona (flujo x402 explicado)
- Cómo instalarlo localmente (variables de entorno, npm install, etc.)
- Variables de entorno requeridas
- URLs de producción (Railway + Vercel)
- Screenshot o GIF del demo

---

### 5. PENDIENTE — Video demo (2-3 minutos)

Solo se puede grabar cuando los pagos x402 estén funcionando.

**Guión del video:**
1. Mostrar la UI — presentar MongliAgent
2. Escribir la pregunta: *"¿Cuáles son los últimos avances en micropagos con blockchain en 2025?"*
3. Presupuesto: $0.05 USDC
4. Clic en Investigar — mostrar el plan en el sidebar
5. Ver el feed de pagos en tiempo real (cada pago con su hash)
6. Hacer clic en un hash → se abre Stellar Expert y se ve la transacción
7. Mostrar el reporte final generado
8. Cerrar con el total gastado y el tiempo

---

## Variables de entorno en Railway (estado actual)

| Variable | Estado |
|---|---|
| `ANTHROPIC_API_KEY` | ✅ configurada (sin créditos — se usa fallback local) |
| `STELLAR_SECRET_KEY` | ✅ configurada |
| `STELLAR_PUBLIC_KEY` | ✅ configurada |
| `STELLAR_NETWORK` | ✅ `testnet` |
| `SEARCH_API_KEY` | ✅ configurada (Brave Search) |
| `PORT` | ✅ `3000` |
| `RECIPIENT_ADDRESS` | ⚠️ Eliminar — tenía valor inválido "Gtukey" |
| `SERVICE_SEARCH_ADDRESS` | ⚠️ Eliminar — innecesaria |
| `SERVICE_SUMMARY_ADDRESS` | ⚠️ Eliminar — innecesaria |
| `SERVICE_DATA_ADDRESS` | ⚠️ Eliminar — innecesaria |
| `SERPAPI_KEY` | ⚠️ Eliminar — duplicada con SEARCH_API_KEY |

---

## URLs de producción

| Servicio | URL |
|---|---|
| UI (Vercel) | (agregar URL de Vercel aquí) |
| Orchestrator (Railway) | `https://mongliagent-production.up.railway.app` |
| Health check | `https://mongliagent-production.up.railway.app/health` |
| Stellar Explorer | `https://stellar.expert/explorer/testnet` |

---

## Requisitos formales del hackathon — checklist

- [x] Repositorio público en GitHub
- [x] Código fuente completo
- [x] UI en español
- [x] Orchestrator deployado
- [ ] README detallado
- [ ] Transacciones reales verificables en Stellar Testnet
- [ ] Video demo de 2-3 minutos

---

## USDC issuer en Testnet

```
GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
```
