# Step 2 - Firebase Data Contract (YWStudio)

## Objetivo
Definir un contrato único, consistente y validable antes de escribir en Firestore.

## Estructura multi-tenant

```text
tenants/{tenantId}
  users/{userId}
  qrCodes/{qrCodeId}
  rewards/{rewardId}
  checkIns/{checkInId}
  walletTransactions/{txId}
  redemptions/{redemptionId}
  auditLogs/{logId}
```

## Versión de contrato
`firebase.contract.v1`

## Campos de auditoría obligatorios
Todas las entidades incluyen:

- `createdAtCustom` (string timestamp custom con dayjs)
- `updatedAtCustom` (string timestamp custom con dayjs)
- `createdBy` (string)
- `updatedBy` (string)

Formato recomendado de timestamp custom:

- `YYYY-MM-DDTHH:mm:ss.SSSZ`

## Reglas de consistencia mínimas

1. Toda entidad debe incluir `tenantId`.
2. Los IDs técnicos son inmutables (`userId`, `rewardId`, etc.).
3. No guardar documentos fuera de esquema.
4. Validar enum/status antes de persistir.
5. Operaciones de saldo/canje deben persistir también en `walletTransactions`.
6. Nunca depender de timezone implícita del cliente sin guardar offset en fecha custom.

## Índices recomendados

- `checkIns`: `userId + scannedAtCustom(desc)`
- `checkIns`: `qrCodeId + scannedAtCustom(desc)`
- `walletTransactions`: `userId + createdAtCustom(desc)`
- `redemptions`: `status + requestedAtCustom(desc)`

## Archivos implementados

- `src/domain/loyalty/dataContract.js`
- `src/domain/loyalty/dataContractValidators.js`
- `src/domain/loyalty/dataFactories.js`
- `src/services/loyaltyDataContractRepository.js`
- `src/store/useLoyaltyDataContractStore.js`
