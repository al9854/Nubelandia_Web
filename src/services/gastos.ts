import type { CategoriaGasto, CrearGastoRequest, Gasto, ListaGastos } from '@/types'
import { api, qs } from './http'

export const gastosService = {
  listar: (categoriaId: number | null) => api.get<ListaGastos>(`/api/gastos${qs({ categoriaId })}`),
  crear: (body: CrearGastoRequest) => api.post<Gasto>('/api/gastos', body),
  categorias: () => api.get<CategoriaGasto[]>('/api/categorias-gasto'),
  crearCategoria: (nombre: string) => api.post<CategoriaGasto>('/api/categorias-gasto', { nombre }),
}
