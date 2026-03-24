# Step 4 - Workflows Operativos (Dashboard)

## Objetivo
Convertir cada módulo del dashboard en flujo operativo real para equipo de studio.

## Flujos implementados

1. Registro de usuarios:
   - alta rápida
   - cambio de estado (`active` / `inactive`)
   - selector de rol operativo (`admin`, `staff`, `readonly`)

2. Gestión QR:
   - creación de campaña QR
   - activación/pausa por campaña
   - control de vigencia y límites operativos

3. Check-ins:
   - formulario operativo de escaneo
   - integración con función transaccional (`registerCheckIn`)
   - fallback local si backend no está disponible
   - feed operativo de resultados

4. Premios y regalías:
   - configuración de premio (alta/edición)
   - activación/pausa por premio
   - ejecución de canje con función transaccional (`redeemReward`)
   - vista de canjes recientes

5. Reportes/canjes:
   - bitácora de canjes
   - cambio de estado de canje (entregado)
   - panel de actividad reciente

## Store operativo

Todo el flujo vive en:

- `src/store/useOperationsStore.js`

Incluye:

- estado de usuarios, qrs, premios, check-ins, canjes
- acciones operativas por módulo
- feed de actividad transversal
- integración con servicios transaccionales

