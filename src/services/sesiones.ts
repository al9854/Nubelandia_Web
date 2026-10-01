import type { CrearSesionRequest, ExtensionRequest, Sesion, Tarjeta } from '@/types'
import { api } from './http'

export const sesionesService = {
  activas: () => api.get<Sesion[]>('/api/sesiones/activas'),
  crear: (body: CrearSesionRequest) => api.post<Sesion>('/api/sesiones', body),
  extender: (id: number, body: ExtensionRequest) => api.post<Sesion>(`/api/sesiones/${id}/extensiones`, body),
  finalizar: (id: number) => api.post<void>(`/api/sesiones/${id}/finalizar`),
  cancelar: (id: number) => api.post<void>(`/api/sesiones/${id}/cancelar`),
  canjear: (tarjetaId: number, hito: number) =>
    api.post<{ sesion: Sesion; tarjeta: Tarjeta }>(`/api/tarjetas/${tarjetaId}/canjes`, { hito }),
}
