# MongliAgent

Agente de investigación autónomo que paga por cada herramienta 
que usa con micropagos en USDC sobre la red Stellar usando el 
protocolo x402. El agente recibe una pregunta y un presupuesto, 
planifica subtareas, contrata servicios externos pagando on-chain, 
y entrega un reporte estructurado.

## Stack
- TypeScript + Express (microservicios x402)
- React + Tailwind (interfaz)
- Stellar Testnet (pagos on-chain con USDC)
- Claude API (orquestación y resúmenes)

## Protocolo de pagos
Usa x402 en Stellar Testnet con transacciones reales verificables.

## Variables de entorno necesarias
STELLAR_SECRET_KEY, STELLAR_PUBLIC_KEY, STELLAR_NETWORK,
ANTHROPIC_API_KEY, SEARCH_API_KEY

## Estado actual
En desarrollo — Hackathon Agents on Stellar, abril 2026.