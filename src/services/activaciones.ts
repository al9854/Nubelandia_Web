import type { Activacion, ActivacionRequest } from '@/types'
import { api } from './http'

export const activacionesService = {
  vigente: () => api.get<Activacion | null>('/api/activaciones/vigente'),
  hoy: () => api.get<Activacion[]>('/api/activaciones/hoy'),
  crear: (body: ActivacionRequest) => api.post<Activacion>('/api/activaciones', body),
  cerrar: (id: number) => api.post<void>(`/api/activaciones/${id}/cerrar`),
}
