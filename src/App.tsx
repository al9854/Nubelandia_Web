import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAdmin, RequireAuth } from './components/layout/Guards'
import { useAuth } from './hooks/useAuth'
import { ConfiguracionPage } from './pages/ConfiguracionPage'
import { FidelidadPage } from './pages/FidelidadPage'
import { GastosPage } from './pages/GastosPage'
import { LoginPage } from './pages/LoginPage'
import { PublicQrPage } from './pages/PublicQrPage'
import { ReportesPage } from './pages/ReportesPage'
import { ReservasPage } from './pages/ReservasPage'
import { SesionesPage } from './pages/SesionesPage'

export function App() {
  const { usuario } = useAuth()

  return (
    <Routes>
      <Route path="/qr" element={<PublicQrPage />} />
      <Route path="/login" element={usuario ? <Navigate to="/sesiones" replace /> : <LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/sesiones" element={<SesionesPage />} />
          <Route path="/fidelidad" element={<FidelidadPage />} />
          <Route path="/reservas" element={<ReservasPage />} />
          <Route path="/gastos" element={<GastosPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/configuracion" element={<ConfiguracionPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/sesiones" replace />} />
    </Routes>
  )
}
