import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthProvider'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Properties from './pages/Properties'
import Clients from './pages/Clients'
import Leads from './pages/Leads'
import Agenda from './pages/Agenda'
import Finance from './pages/Finance'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Auth from './components/Auth'
import ResetPassword from './pages/ResetPassword'

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
    </AuthProvider>
  )
}
