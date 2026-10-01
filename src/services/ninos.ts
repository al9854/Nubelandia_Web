import type {
  CambioDato,
  CrearNinoRequest,
  EditarNinoRequest,
  NinoBusqueda,
  Tarjeta,
} from '@/types'
import { api, qs } from './http'

export const ninosService = {
  buscar: (q: string) => api.get<NinoBusqueda[]>(`/api/ninos/buscar${qs({ q })}`),
  crear: (body: CrearNinoRequest) => api.post<NinoBusqueda>('/api/ninos', body),
  editar: (id: number, body: EditarNinoRequest) => api.put<NinoBusqueda>(`/api/ninos/${id}`, body),
  desactivar: (id: number) => api.post<void>(`/api/ninos/${id}/desactivar`),
  cambios: (id: number) => api.get<CambioDato[]>(`/api/ninos/${id}/cambios`),
  tarjeta: (id: number) => api.get<Tarjeta | null>(`/api/ninos/${id}/tarjeta`),
}
