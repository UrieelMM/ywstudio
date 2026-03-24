# Step 3 - Transaction Engine (Cloud Functions)

## Objetivo
Ejecutar operaciones críticas de lealtad de forma atómica, idempotente y auditada.

## Endpoints implementados

1. `registerCheckIn`
2. `redeemReward`

## Características clave

- Idempotencia por `idempotencyKey`.
- Transacciones Firestore (`runTransaction`) para evitar carreras de datos.
- Bloqueos antifraude:
  - usuario activo
  - QR/premio activo
  - vigencia de QR/premio
  - cooldown entre escaneos
  - límite de escaneos por día
  - saldo suficiente para canje
  - stock disponible
  - límite de canjes por usuario
  - regla same-day redeem
- Ledger de saldo (`walletTransactions`) en cada operación válida.
- Auditoría (`auditLogs`) para éxito y rechazo.

## Colecciones auxiliares del motor

- `dailyUsage`: contador diario de escaneos válidos/bloqueados por usuario.
- `userRewardCounters`: contador de canjes por usuario/premio.

## Ubicación de código

- `functions/src/index.js`
- `src/services/loyaltyTransactionsService.js`

## Nota de despliegue

Antes de desplegar funciones:

1. `cd functions`
2. `npm install`
3. `cd ..`
4. `firebase deploy --only functions`

