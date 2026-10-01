import type { ResumenReportes } from '@/types'
import { api, qs } from './http'

export const reportesService = {
  resumen: (desde: string, hasta: string) =>
    api.get<ResumenReportes>(`/api/reportes/resumen${qs({ desde, hasta })}`),
}
