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

## 3) Ejecutar en desarrollo

```bash
npm run dev
```

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
