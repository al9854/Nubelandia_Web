import type { VistaQr } from '@/types'
import { api } from './http'

export const publicoService = {
  qr: () => api.get<VistaQr>('/public/qr'),
  autorizar: (acepta: boolean) => api.post<VistaQr>('/public/qr/autorizar', { acepta }),
}
