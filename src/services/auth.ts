import type { Usuario } from '@/types'
import { api } from './http'

export const authService = {
  login: (usuario: string, contrasena: string) =>
    api.post<Usuario>('/api/auth/login', { usuario, contrasena }),
  logout: () => api.post<void>('/api/auth/logout'),
}
