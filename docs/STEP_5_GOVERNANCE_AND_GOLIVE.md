# Step 5 - Gobernanza, métricas y go-live

## Objetivo
Agregar una capa operativa premium para salida a producción con control de riesgo.

## Componentes implementados

1. KPIs de gobernanza:
   - usuarios activos
   - aprobación de check-ins
   - éxito de canjes
   - salud de stock
   - cobertura de auditoría

2. Control de rollout:
   - fases `pilot`, `controlled`, `full`
   - feature flags operativas

3. Go-live checklist:
   - control por owner
   - avance porcentual del checklist

4. Incidentes:
   - alta de incidente
   - resolución y trazabilidad

5. Registro de riesgos:
   - riesgo + severidad
   - estado y mitigación

## Archivos principales

- `src/domain/loyalty/governanceMetrics.js`
- `src/store/useGovernanceStore.js`
- `src/pages/redemptions/RedemptionsReportsPage.jsx`

