import { Navigate, createBrowserRouter } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import QrManagementPage from '../pages/qr/QrManagementPage'
import RedemptionsReportsPage from '../pages/redemptions/RedemptionsReportsPage'
import RewardsRulesPage from '../pages/rewards/RewardsRulesPage'
import UsersPage from '../pages/users/UsersPage'
import VisitsControlPage from '../pages/visits/VisitsControlPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/usuarios" replace /> },
      { path: 'usuarios', element: <UsersPage /> },
      { path: 'qrs', element: <QrManagementPage /> },
      { path: 'visitas', element: <VisitsControlPage /> },
      { path: 'premios', element: <RewardsRulesPage /> },
      { path: 'canjes', element: <RedemptionsReportsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/usuarios" replace />,
  },
])

export default router
