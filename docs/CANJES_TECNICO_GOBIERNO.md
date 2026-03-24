# Canjes: Bloque Técnico de Gobernanza

Este documento concentra lo que se retiró de la UI de `/canjes` para mantener la experiencia más limpia para operación diaria.

## 1) Go-live checklist (operativo/técnico)

Estado base en store (`src/store/useGovernanceStore.js`):

1. `rules_deployed`: Reglas Firestore desplegadas (owner: Backend)
2. `indexes_deployed`: Índices Firestore sincronizados (owner: Backend)
3. `functions_deployed`: Cloud Functions en producción (owner: Backend)
4. `smoke_test_checkin`: Smoke test de check-in aprobado/bloqueado (owner: QA)
5. `smoke_test_redeem`: Smoke test de canje con saldo/stock (owner: QA)
6. `incident_protocol`: Protocolo de incidentes validado (owner: Ops)

## 2) Fases de rollout

Definidas en `src/domain/loyalty/governanceMetrics.js`:

1. `pilot`: grupo reducido, monitoreo intensivo
2. `controlled`: escalamiento parcial por sede
3. `full`: operación completa

## 3) Feature flags del programa

Definidas en `src/store/useGovernanceStore.js`:

1. `checkInEnabled`
2. `redemptionEnabled`
3. `manualAdjustmentsEnabled`
4. `emergencyPause`
5. `exportReportsEnabled`

## 4) Política recomendada de uso

1. La UI de canjes se enfoca en operación (bitácora, estados, incidentes y riesgos).
2. Los cambios de fase/flags deben vivir en runbooks internos o en un módulo técnico dedicado.
3. Antes de pasar de `pilot` a `controlled`, ejecutar smoke tests de check-in y canje.
