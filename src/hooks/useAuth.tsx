import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { Usuario } from '@/types'
import { authService, setUnauthorizedHandler } from '@/services'
import { guardarUsuario, leerUsuarioGuardado } from '@/lib/session'

interface AuthState {
  usuario: Usuario | null
  esAdmin: boolean
  login: (usuario: string, contrasena: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => leerUsuarioGuardado())
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const limpiar = useCallback(() => {
    guardarUsuario(null)
    setUsuario(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      limpiar()
      navigate('/login', { replace: true, state: { motivo: 'sesion-invalida' } })
    })
    return () => setUnauthorizedHandler(null)
  }, [limpiar, navigate])

  const login = useCallback(async (user: string, pass: string) => {
    const u = await authService.login(user, pass)
    guardarUsuario(u)
    setUsuario(u)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      limpiar()
      navigate('/login', { replace: true })
    }
  }, [limpiar, navigate])

  const value = useMemo<AuthState>(
    () => ({ usuario, esAdmin: usuario?.rol === 'admin', login, logout }),
    [usuario, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
