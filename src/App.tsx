import { Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './components/AuthProvider'
import Layout from './components/Layout'
import { QueryProvider } from './lib/query'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Properties = lazy(() => import('./pages/Properties'))
const Clients = lazy(() => import('./pages/Clients'))
const Leads = lazy(() => import('./pages/Leads'))
const Agenda = lazy(() => import('./pages/Agenda'))
const Finance = lazy(() => import('./pages/Finance'))
const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))
const Auth = lazy(() => import('./components/Auth'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

function PageLoader() {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>Carregando...</span>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, isConfigured } = useAuth()
  if (loading) return null
  if (!isConfigured) return <>{children}</>
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <QueryProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="auth" element={<RequireGuest><Auth /></RequireGuest>} />
            <Route path="redefinir-senha" element={<ResetPassword />} />
            <Route element={<RequireAuth><Layout /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="imoveis" element={<Properties />} />
              <Route path="clientes" element={<Clients />} />
              <Route path="leads" element={<Leads />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="financeiro" element={<Finance />} />
              <Route path="relatorios" element={<Reports />} />
              <Route path="configuracoes" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </QueryProvider>
    </AuthProvider>
  )
}
