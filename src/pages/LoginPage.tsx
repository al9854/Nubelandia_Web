import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import logo from '@/assets/logo-nubelandia.png'
import elefante from '@/assets/elefante.jpg'
import { useAuth } from '@/hooks/useAuth'
import { USE_MOCKS, mensajeDeError } from '@/services'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Fields'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const motivo = (location.state as { motivo?: string } | null)?.motivo

  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await login(usuario.trim(), contrasena)
      navigate('/sesiones', { replace: true })
    } catch (err) {
      setError(mensajeDeError(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] bg-white max-lg:grid-cols-1">
      <div className="relative min-h-screen overflow-hidden bg-[#e9f0f7] max-lg:hidden">
        <img src={elefante} alt="Elefante de Nubelandia" className="absolute inset-0 h-full w-full object-cover object-[center_40%]" />
        <div className="absolute inset-x-8 bottom-7 flex flex-wrap justify-between gap-4 text-sm font-bold text-[#3a4a6b]">
          <span>Martes a domingo · 3:00 – 8:00 p. m.</span>
          <span>Calle Manuel Garay 289, Puente Piedra</span>
        </div>
      </div>
      <div className="flex items-center justify-center p-12">
        <form onSubmit={enviar} className="flex w-full max-w-[400px] flex-col gap-[22px]">
          <img src={logo} alt="Nubelandia" className="w-[280px] max-w-full self-center" />
          <div className="flex flex-col gap-1 text-center">
            <div className="font-display text-[30px] font-bold leading-[1.1]">Panel del salón</div>
            <div className="text-[15px] text-texto-2">Ingresa con tu usuario de empleado o administrador.</div>
          </div>
          {motivo === 'sesion-invalida' && !error && (
            <div className="rounded-xl bg-naranja-50 px-3.5 py-2.5 text-sm font-bold text-naranja-800">
              Tu sesión terminó o se abrió en otro lugar. Ingresa de nuevo.
            </div>
          )}
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Usuario
            <Input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              autoFocus
              className="h-[50px] rounded-[14px] bg-white text-base"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Contraseña
            <Input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="h-[50px] rounded-[14px] bg-white text-base"
            />
          </label>
          {error && <div className="rounded-xl bg-rojo-50 px-3.5 py-2.5 text-sm font-bold text-rojo-800">{error}</div>}
          <Button type="submit" variant="primary" size="lg" disabled={cargando || !usuario || !contrasena}>
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </Button>
          {USE_MOCKS && (
            <div className="text-center text-[13px] text-texto-4">
              Demo: admin / nube123 (administrador) · lucia / nube123 (empleado)
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
