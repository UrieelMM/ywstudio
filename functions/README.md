# YWStudio Cloud Functions

## Funciones incluidas (Step 3)

- `registerCheckIn`
- `redeemReward`

## Comandos

```bash
npm install
npm run serve
npm run deploy
```

## Nota

Estas funciones usan:

- transacciones Firestore
- idempotencia por `idempotencyKey`
- timestamps custom con `dayjs`
- auditoría y ledger

