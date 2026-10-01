import type {
  Configuracion,
  CrearUsuarioRequest,
  PlanReserva,
  ReglaFidelidad,
  Tarifa,
  Usuario,
} from '@/types'
import { api } from './http'

export const configuracionService = {
  obtener: () => api.get<Configuracion>('/api/configuracion'),
  guardarClave: (clave: 'modo_mantenimiento' | 'facebook_url', valor: string) =>
    api.put<Configuracion>(`/api/configuracion/${clave}`, { valor }),

  tarifas: () => api.get<Tarifa[]>('/api/tarifas'),
  guardarTarifa: (id: number, body: Pick<Tarifa, 'precio' | 'activa'>) =>
    api.put<Tarifa>(`/api/tarifas/${id}`, body),

  planes: () => api.get<PlanReserva[]>('/api/planes-reserva'),
  guardarPlan: (id: number, body: Omit<PlanReserva, 'id'>) =>
    api.put<PlanReserva>(`/api/planes-reserva/${id}`, body),
  crearPlan: (body: Omit<PlanReserva, 'id'>) => api.post<PlanReserva>('/api/planes-reserva', body),

  reglas: () => api.get<ReglaFidelidad[]>('/api/reglas'),
  guardarRegla: (id: number, body: Pick<ReglaFidelidad, 'descripcionRecompensa' | 'activa'>) =>
    api.put<ReglaFidelidad>(`/api/reglas/${id}`, body),

  usuarios: () => api.get<Usuario[]>('/api/usuarios'),
  crearUsuario: (body: CrearUsuarioRequest) => api.post<Usuario>('/api/usuarios', body),
  guardarUsuario: (id: number, body: { activo: boolean }) => api.put<Usuario>(`/api/usuarios/${id}`, body),
}
