# Pendientes — MongliAgent Hackathon

**Fecha límite:** 13 de abril 2026 · **Última actualización:** 13 de abril ~3:30 AM

---

## ✅ Completado

| Ítem | Notas |
|---|---|
| Orchestrator deployado en Railway | Corriendo en Railway |
| UI en español con logo e Instagram | Vercel |
| UI conectada a Railway | VITE_ORCHESTRATOR_URL configurada |
| UI responsive para móvil (tabs) | Form / Feed / Reporte |
| Live feed con polling cada 2s | Funciona |
| Planner sin Claude API (fallback) | Funciona sin créditos |
| Reporte sin Claude API (local) | Fallback local con markdown |
| Fix Stellar SDK (Memo.text) | Corregido |
| Tablas markdown renderizadas (remark-gfm) | Funciona |
| Transacciones on-chain visibles para jueces | Links a Stellar Expert |
| Wallet del servidor fondeada (XLM + USDC testnet) | 20 USDC testnet |
| Pagos x402 reales ejecutándose | 2 tx reales confirmadas |
| README completo y pulido | Incluye diagrama x402, variables, deploy, API |
| **Wallet Connect con Freighter** | Implementado — firma real con wallet del usuario |

---

## ⬜ Pendiente

| Ítem | Prioridad | Notas |
|---|---|---|
| **Video demo** | 🔴 Alta | Requerido por los jueces. 2-3 minutos |
| Deploy del orchestrator con cambios de Freighter | 🔴 Alta | Hay que hacer push y que Railway redeploy |
| Deploy de la UI con cambios de Freighter | 🔴 Alta | Push + que Vercel redeploy |
| Instalar Freighter en el navegador del demo | 🔴 Alta | Necesario para mostrar el flujo completo |
| Fondear wallet de Freighter con USDC testnet | 🟡 Media | Friendbot XLM + trustline USDC + Circle faucet |
| Limpiar variables innecesarias en Railway | 🟢 Baja | RECIPIENT_ADDRESS, SERPAPI_KEY, etc. |

---

## 📹 Guión del video demo

1. Abrir la UI — presentar MongliAgent
2. Mostrar botón "Conectar Wallet" en el header → conectar Freighter
3. Ver la dirección de la wallet conectada en el sidebar
4. Escribir pregunta: *"¿Cuáles son los últimos avances en micropagos con blockchain?"*
5. Presupuesto: $0.05 USDC — clic en Investigar
6. Aparece banner "Esperando firma de Freighter…" → Freighter abre popup
7. Aprobar el pago → ver la tx aparecer en el feed en tiempo real
8. Repetir para el segundo pago
9. Clic en un hash → Stellar Expert → transacción real del usuario
10. Mostrar el reporte final con fuentes

---

## 🚀 Pasos para el deploy final

### 1. Push del código
```bash
git add -A
git commit -m "feat: Wallet Connect con Freighter + README"
git push
```

### 2. Railway — redeploy automático tras el push

### 3. Vercel — redeploy automático tras el push

### 4. Probar en producción
- Abrir https://mongliagent.vercel.app
- Conectar Freighter (extensión en Chrome)
- Hacer una investigación y aprobar los pagos

---

## Variables en Railway — limpiar (baja prioridad)

Eliminar estas variables innecesarias:

| Variable | Acción |
|---|---|
| `RECIPIENT_ADDRESS` | Eliminar |
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
| UI (Vercel) | `https://mongliagent.vercel.app` |
| Stellar Explorer | `https://stellar.expert/explorer/testnet` |
| Wallet del agente | `GAEMNYLXVHXU3LOISQDACN3KPJULUIO2QUK3H5I2A2DDZOO3AHVEWIO4` |

---

## Checklist final del hackathon

- [x] Repositorio público en GitHub
- [x] Código fuente completo
- [x] UI en español
- [x] Orchestrator deployado y corriendo
- [x] Transacciones reales en Stellar Testnet (hash verificable)
- [x] README detallado con diagrama x402
- [x] Wallet Connect con Freighter implementado
- [ ] **Deploy del código nuevo** (push + Railway/Vercel redeploy)
- [ ] **Video demo de 2-3 minutos**

---

## USDC issuer testnet

```
GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
```
