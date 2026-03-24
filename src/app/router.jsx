import { Navigate, createBrowserRouter } from 'react-router-dom'
import AuthBootstrap from '../components/auth/AuthBootstrap'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import PublicOnlyRoute from '../components/auth/PublicOnlyRoute'
import AppLayout from '../layouts/AppLayout'
import LoginPage from '../pages/auth/LoginPage'
import QrManagementPage from '../pages/qr/QrManagementPage'
import RedemptionsReportsPage from '../pages/redemptions/RedemptionsReportsPage'
import RewardsRulesPage from '../pages/rewards/RewardsRulesPage'
import UsersPage from '../pages/users/UsersPage'
import VisitsControlPage from '../pages/visits/VisitsControlPage'

const router = createBrowserRouter([
  {
    element: <AuthBootstrap />,
    children: [
      {
        path: '/login',
        element: <PublicOnlyRoute />,
        children: [{ index: true, element: <LoginPage /> }],
      },
      {
        element: <ProtectedRoute />,
        children: [
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
        ],
      },
      {
        path: '*',
        element: <Navigate to="/usuarios" replace />,
      },
    ],
  },
])

export default router
