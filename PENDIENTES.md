# Pendientes — MongliAgent Hackathon

**Fecha límite:** 13 de abril 2026 · **Última actualización:** 12 de abril ~3:30 PM

---

## Estado actual

| Ítem | Estado |
|---|---|
| Orchestrator deployado en Railway | ✅ Listo |
| UI en español con logo e Instagram | ✅ Listo |
| UI conectada a Railway | ✅ Listo |
| UI responsive para móvil (tabs) | ✅ Listo |
| Live feed con polling cada 2s | ✅ Listo |
| Planner sin Claude API (fallback) | ✅ Listo |
| Reporte sin Claude API (local) | ✅ Listo |
| Fix Stellar SDK (Memo.text) | ✅ Listo |
| Tablas markdown renderizadas (remark-gfm) | ✅ Listo |
| Transacciones on-chain visibles para jueces | ✅ Listo |
| Wallet del servidor fondeada (XLM + USDC testnet) | ✅ Listo |
| Pagos x402 reales ejecutándose | ✅ **FUNCIONANDO** — 2 tx reales confirmadas |
| Wallet Connect / login usuario con Freighter | ⬜ Pendiente |
| README actualizado | ⬜ Pendiente |
| Video demo grabado | ⬜ Pendiente |

---

## Lo que falta para el hackathon

### 1. README — requerido por los jueces

El README actual está incompleto. Necesita:
- Descripción del proyecto (qué es MongliAgent, cómo funciona)
- Flujo x402 explicado (pregunta → plan → pago Stellar → resultado)
- Variables de entorno requeridas
- URLs de producción (Railway + Vercel)
- Screenshot del demo

---

### 2. Video demo — requerido (2-3 minutos)

Ya se puede grabar porque los pagos funcionan.

**Guión:**
1. Mostrar la UI — presentar MongliAgent
2. Escribir pregunta: *"¿Cuáles son los últimos avances en micropagos con blockchain?"*
3. Presupuesto: $0.05 USDC — clic en Investigar
4. Mostrar el feed de pagos en tiempo real
5. Hacer clic en un hash → Stellar Expert → transacción real
6. Mostrar el reporte final con fuentes

---

### 3. Wallet Connect con Freighter (opcional pero impresiona)

Permitir que el visitante conecte su propia wallet Freighter y pague con sus fondos.

**Lo que hay que hacer:**
- Instalar `@stellar/freighter-api` en la UI
- Agregar botón "Conectar Wallet" en el header
- Mostrar la public key del usuario conectado
- Enviar pagos firmados desde el frontend en vez del servidor

**Complejidad:** Alta. Requiere rediseño del flujo payAndFetch.
**Alternativa simple:** Solo mostrar la public key del servidor como "wallet del agente" — ya se muestra en `/health`.

---

## Variables en Railway — limpiar

Eliminar estas variables innecesarias que pueden causar confusión:

| Variable | Acción |
|---|---|
| `RECIPIENT_ADDRESS` | Eliminar (tenía valor inválido) |
| `SERVICE_SEARCH_ADDRESS` | Eliminar |
| `SERVICE_SUMMARY_ADDRESS` | Eliminar |
| `SERVICE_DATA_ADDRESS` | Eliminar |
| `SERPAPI_KEY` | Eliminar (duplicada con SEARCH_API_KEY) |

---

## URLs de producción

| Servicio | URL |
|---|---|
| Orchestrator (Railway) | `https://mongliagent-production.up.railway.app` |
| Health check | `https://mongliagent-production.up.railway.app/health` |
| Stellar Explorer | `https://stellar.expert/explorer/testnet` |
| Wallet del agente | `GAEMNYLXVHXU3LOISQDACN3KPJULUIO2QUK3H5I2A2DDZOO3AHVEWIO4` |

---

## Checklist final del hackathon

- [x] Repositorio público en GitHub
- [x] Código fuente completo
- [x] UI en español
- [x] Orchestrator deployado y corriendo
- [x] Transacciones reales en Stellar Testnet (hash verificable)
- [ ] README detallado
- [ ] Video demo de 2-3 minutos
- [ ] (Opcional) Wallet Connect con Freighter

---

## USDC issuer testnet

```
GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
```
