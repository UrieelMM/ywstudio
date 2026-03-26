# YWStudio Loyalty Dashboard (Base)

Proyecto base con:

- React + Vite
- Tailwind CSS `3.4.1`
- React Router DOM
- Zustand
- Firebase (Auth + Firestore) listo por variables de entorno
- Day.js para fechas
- React Hot Toast para notificaciones
- Lucide React para iconografía

## 1) Instalar dependencias

```bash
npm install
```

## 2) Configurar Firebase

Crea tu archivo `.env` a partir de `.env.example` y pega tus credenciales.

```bash
cp .env.example .env
```

Variables esperadas:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_PUBLIC_SCAN_BASE_URL` (opcional, para forzar dominio público de QR; default usa `window.location.origin`)
- `VITE_FIREBASE_DATABASE_URL` (opcional, para Realtime Database; default usa `https://<projectId>-default-rtdb.firebaseio.com`)

## 3) Ejecutar en desarrollo

```bash
npm run dev
```

## 4) Activar Login (Firebase Auth)

1. En Firebase Console entra a `Authentication > Sign-in method`.
2. Habilita `Email/Password`.
3. Crea al menos un usuario en `Authentication > Users`.
4. Inicia sesión en `/login`.

## Colores de marca

- `primary`: `#e0cec2`
- `secondary`: `#b8947f`

Se definen en `tailwind.config.js`.

## Rutas MVP

- `/usuarios`
- `/qrs`
- `/visitas`
- `/premios`
- `/canjes`
- `/scan/:qrCodeId` (pública para auto check-in por QR)

## Step 2 Implementado (Data Contract Firebase)

- Contrato canónico multi-tenant: `tenants/{tenantId}/...`
- Validadores de contrato por entidad antes de persistir
- Factories con fechas custom `dayjs` (`createdAtCustom`, `updatedAtCustom`)
- Repositorio Firestore para escritura/lectura consistente
- Store de validación de contrato (`useLoyaltyDataContractStore`)

Archivos principales:

- `src/domain/loyalty/dataContract.js`
- `src/domain/loyalty/dataContractValidators.js`
- `src/domain/loyalty/dataFactories.js`
- `src/services/loyaltyDataContractRepository.js`
- `src/store/useLoyaltyDataContractStore.js`
- `docs/STEP_2_DATA_CONTRACT.md`
- `firebase/firestore.rules`
- `firebase/firestore.indexes.json`

## Step 3 Implementado (Motor transaccional)

- Cloud Functions transaccionales en `functions/src/index.js`
- Endpoints:
  - `registerCheckIn`
  - `registerCheckInByPublicIdentity` (público: `userId + email + qrCodeId`)
  - `redeemReward`
- Idempotencia por `idempotencyKey`
- Ledger en `walletTransactions`
- Bloqueos antifraude + auditoría

Documentación:

- `docs/STEP_3_TRANSACTION_ENGINE.md`

Deploy de Cloud Functions:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## Realtime visits (RTDB + Firestore)

- Las visitas (`checkIns`) se mantienen canónicas en Firestore.
- Se publica un espejo en Realtime Database (`tenants/{tenantId}/checkInFeed`) para refresco instantáneo del dashboard.
- El dashboard se suscribe en tiempo real al feed al iniciar sesión.

Deploy recomendado para reglas:

```bash
firebase deploy --only firestore:rules,database,storage
```

## Step 4 Implementado (Workflows operativos UI)

- Store operativo transversal: `src/store/useOperationsStore.js`
- Flujos activos en módulos:
  - alta/cambio de estado de usuarios
  - creación/pausa de campañas QR
  - check-ins operativos
  - configuración/canje de premios
  - seguimiento y cierre de canjes
- Documentación: `docs/STEP_4_OPERATION_WORKFLOWS.md`

## Step 5 Implementado (Gobernanza y go-live)

- KPIs de salud operativa y score de gobernanza
- Gestión de fases de rollout (`pilot`, `controlled`, `full`)
- Feature flags operativas
- Checklist go-live con avance
- Registro de incidentes y riesgos

Documentación:

- `docs/STEP_5_GOVERNANCE_AND_GOLIVE.md`
- `docs/CANJES_TECNICO_GOBIERNO.md` (detalle técnico movido fuera de UI de canjes)
