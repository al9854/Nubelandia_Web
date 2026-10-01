import type { CrearReservaRequest, EstadoReserva, Reserva } from '@/types'
import { api, qs } from './http'

export type FiltroReservas = 'proximas' | 'todas'

export const reservasService = {
  listar: (filtro: FiltroReservas) => api.get<Reserva[]>(`/api/reservas${qs({ filtro })}`),
  crear: (body: CrearReservaRequest) => api.post<Reserva>('/api/reservas', body),
  cambiarEstado: (id: number, estado: EstadoReserva) =>
    api.post<Reserva>(`/api/reservas/${id}/estado`, { estado }),
}
